import test from "node:test";
import assert from "node:assert/strict";
import {checkoutRoute,resolveVerifiedEmail} from "../src/services/checkoutRoutes.js";

const request = (body,auth=true) => new Request("https://api.example.test/v1/billing/checkout",{
  method:"POST",
  headers:{"Content-Type":"application/json",...(auth?{Authorization:"Bearer valid"}:{})},
  body:JSON.stringify(body)
});
const plan = {code:"basic",amount_minor:4000,currency:"ZAR",interval:"monthly",paystack_plan_code:"PLN_abc123"};
function fixture(overrides={}) {
  const writes=[];
  const db={
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first(){return plan;},
            async run(){writes.push({sql,args});return {success:true};}
          };
        }
      };
    }
  };
  const quota={idFromName:()=>({}),get:()=>({fetch:async()=>Response.json({allowed:true})})};
  const env={DB:db,QUOTA_COUNTER:quota,PAYSTACK_SECRET_KEY:"sk_test_example",CLERK_SECRET_KEY:"sk_example",...overrides};
  return {env,writes};
}
const verify=async()=>({userId:"user_test",sessionId:"sess_test"});
const resolveEmail=async()=>"verified@example.org";
const fakePaystack=async(_url,opts)=>{
  const payload=JSON.parse(opts.body);
  assert.equal(payload.email,"verified@example.org");
  assert.equal(payload.amount,4000);
  assert.equal(payload.currency,"ZAR");
  assert.equal(payload.plan,"PLN_abc123");
  return Response.json({status:true,data:{reference:payload.reference,authorization_url:"https://checkout.paystack.com/secure-test"}});
};
test("checkout uses database plan, creates initialized transaction and returns hosted URL",async()=>{
  const {env,writes}=fixture();
  const res=await checkoutRoute(request({plan:"basic"}),env,{verify,resolveEmail,fetcher:fakePaystack});
  assert.equal(res.status,200);
  const body=await res.json();
  assert.equal(body.data.amount_minor,4000);
  assert.equal(body.data.plan,"basic");
  assert.equal(body.data.authorization_url,"https://checkout.paystack.com/secure-test");
  assert.ok(writes.some(w=>w.sql.includes("INSERT INTO billing_transactions")));
});
test("checkout rejects caller supplied amounts and extra fields",async()=>{
  const {env}=fixture();
  const res=await checkoutRoute(request({plan:"basic",amount:1}),env,{verify,resolveEmail,fetcher:fakePaystack});
  assert.equal(res.status,400);
  assert.equal((await res.json()).error.code,"INVALID_PLAN");
});
test("checkout rejects unauthenticated requests",async()=>{
  const {env}=fixture();
  const res=await checkoutRoute(request({plan:"basic"},false),env,{verify:async()=>null});
  assert.equal(res.status,401);
});
test("checkout is disabled without test-mode Paystack secret",async()=>{
  const {env}=fixture({PAYSTACK_SECRET_KEY:"sk_live_dont_use"});
  const res=await checkoutRoute(request({plan:"basic"}),env,{verify});
  assert.equal(res.status,503);
  assert.equal((await res.json()).error.code,"PAYMENTS_NOT_CONFIGURED");
});
test("checkout rejects untrusted hosted checkout destinations",async()=>{
  const {env,writes}=fixture();
  const res=await checkoutRoute(request({plan:"basic"}),env,{verify,resolveEmail,fetcher:async(_url,opts)=>{
    const payload=JSON.parse(opts.body);
    return Response.json({status:true,data:{reference:payload.reference,authorization_url:"https://checkout.paystack.com.attacker.invalid/" }});
  }});
  assert.equal(res.status,503);
  assert.equal(writes.some(w=>w.sql.includes("INSERT INTO billing_transactions")),false);
});
test("checkout rejects Paystack reference mismatch",async()=>{
  const {env}=fixture();
  const res=await checkoutRoute(request({plan:"basic"}),env,{verify,resolveEmail,fetcher:async()=>Response.json({status:true,data:{reference:"wrong",authorization_url:"https://checkout.paystack.com/x"}})});
  assert.equal(res.status,503);
});
test("Clerk email lookup requires matching user and verified primary address",async()=>{
  const fetcher=async()=>Response.json({id:"user_test",primary_email_address_id:"id1",email_addresses:[{id:"id1",email_address:"verified@example.org",verification:{status:"verified"}}]});
  assert.equal(await resolveVerifiedEmail("user_test","sk_test",fetcher),"verified@example.org");
  await assert.rejects(()=>resolveVerifiedEmail("user_other","sk_test",fetcher));
});

// PAY-002 redirect compatibility regression tests

const redirectStatuses = [301,302,303,307,308];

test("Clerk email lookup uses manual redirect mode",async()=>{
  let observedOptions;

  const fetcher=async(_url,opts)=>{
    observedOptions=opts;

    return Response.json({
      id:"user_test",
      primary_email_address_id:"id1",
      email_addresses:[{
        id:"id1",
        email_address:"verified@example.org",
        verification:{status:"verified"}
      }]
    });
  };

  const email=await resolveVerifiedEmail(
    "user_test","sk_test",fetcher
  );

  assert.equal(email,"verified@example.org");
  assert.equal(observedOptions.redirect,"manual");
});

test("Clerk email lookup rejects upstream redirects",async()=>{
  for(const status of redirectStatuses){
    let calls=0;

    const fetcher=async()=>{
      calls++;

      return new Response(null,{
        status,
        headers:{Location:"https://attacker.invalid/"}
      });
    };

    await assert.rejects(
      ()=>resolveVerifiedEmail("user_test","sk_test",fetcher),
      /Clerk user lookup failed/
    );

    assert.equal(calls,1);
  }
});

test("checkout rejects Clerk redirects before calling Paystack",async()=>{
  for(const status of redirectStatuses){
    const {env,writes}=fixture();
    const calls=[];

    const fetcher=async(url,opts)=>{
      calls.push({url,opts});

      return new Response(null,{
        status,
        headers:{Location:"https://attacker.invalid/"}
      });
    };

    const res=await checkoutRoute(
      request({plan:"basic"}),
      env,
      {verify,fetcher}
    );

    assert.equal(res.status,422);
    assert.equal(
      (await res.json()).error.code,
      "VERIFIED_EMAIL_REQUIRED"
    );

    assert.equal(calls.length,1);
    assert.equal(
      calls[0].url,
      "https://api.clerk.com/v1/users/user_test"
    );
    assert.equal(calls[0].opts.redirect,"manual");

    assert.equal(
      writes.some(w=>w.sql.includes("INSERT INTO billing_transactions")),
      false
    );
  }
});

test("Paystack initialization uses manual redirect mode",async()=>{
  const {env}=fixture();
  let observedOptions;

  const fetcher=async(url,opts)=>{
    observedOptions=opts;
    return fakePaystack(url,opts);
  };

  const res=await checkoutRoute(
    request({plan:"basic"}),
    env,
    {verify,resolveEmail,fetcher}
  );

  assert.equal(res.status,200);
  assert.equal(observedOptions.redirect,"manual");
});

test("checkout rejects Paystack upstream redirects",async()=>{
  for(const status of redirectStatuses){
    const {env}=fixture();
    let calls=0;
    let observedOptions;

    const fetcher=async(_url,opts)=>{
      calls++;
      observedOptions=opts;

      return new Response(null,{
        status,
        headers:{Location:"https://attacker.invalid/"}
      });
    };

    const res=await checkoutRoute(
      request({plan:"basic"}),
      env,
      {verify,resolveEmail,fetcher}
    );

    assert.equal(res.status,503);
    assert.equal(
      (await res.json()).error.code,
      "CHECKOUT_UNAVAILABLE"
    );

    assert.equal(calls,1);
    assert.equal(observedOptions.redirect,"manual");
  }
});

test("Paystack redirects do not create billing transactions",async()=>{
  for(const status of redirectStatuses){
    const {env,writes}=fixture();

    const fetcher=async()=>new Response(null,{
      status,
      headers:{Location:"https://attacker.invalid/"}
    });

    const res=await checkoutRoute(
      request({plan:"basic"}),
      env,
      {verify,resolveEmail,fetcher}
    );

    assert.equal(res.status,503);

    assert.equal(
      writes.some(w=>w.sql.includes("INSERT INTO billing_transactions")),
      false
    );
  }
});
