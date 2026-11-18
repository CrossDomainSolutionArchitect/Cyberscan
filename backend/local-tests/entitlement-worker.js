export {QuotaDurableObject} from "../src/durable/QuotaDurableObject.js";
import {enforceRateLimit} from "../src/security/rateLimiter.js";
import {ensureUser, allowance, reserveScan, finishScan} from "../src/services/entitlements.js";
import {customerRoute} from "../src/services/customerRoutes.js";
export default {
 async fetch(request, env) {
  if (new URL(request.url).pathname !== "/test" || request.method !== "POST") return new Response("Not found",{status:404});
  const db=env.DB, a="user_test_"+crypto.randomUUID(), b="user_test_"+crypto.randomUUID();
  const checks=[];
  const c="user_test_"+crypto.randomUUID();
  const testIp="synthetic-"+crypto.randomUUID();
  function check(name, condition){checks.push({name,passed:Boolean(condition)});}
  try {
   await ensureUser(db,a); await ensureUser(db,b);
   check("Initial allowance", (await allowance(db,a)).remaining===3);
   const ids=Array.from({length:10},()=>crypto.randomUUID());
   const accepted=await Promise.all(ids.map(id=>reserveScan(db,a,id)));
   check("Ten concurrent reservations admit exactly three",accepted.filter(Boolean).length===3);
   check("Reserved allowance exhausted",(await allowance(db,a)).remaining===0);
   const selected=ids.filter((_,i)=>accepted[i]);
   if(selected.length!==3) throw new Error("Unexpected reservation count");
   await finishScan(db,a,selected[0],false);
   check("Failed scan restores allowance",(await allowance(db,a)).remaining===1);
   const replacement=crypto.randomUUID();
   check("Replacement reservation accepted",await reserveScan(db,a,replacement));
   await finishScan(db,a,replacement,true);
   for(const id of selected.slice(1)) await finishScan(db,a,id,true);
   check("Three completed scans exhaust allowance",(await allowance(db,a)).remaining===0);
   await ensureUser(db,a);
   check("Repeated user initialization does not reset allowance",(await allowance(db,a)).remaining===0);
   check("Independent customer allowance",(await allowance(db,b)).remaining===3);
   let rejected=false;try{await finishScan(db,a,replacement,true);}catch{rejected=true;}
   check("Duplicate settlement rejected",rejected && (await allowance(db,a)).remaining===0);
   const response=await customerRoute(new Request("https://test.invalid/v1/scans",{method:"POST",headers:{Authorization:"Bearer synthetic","Content-Type":"application/json","CF-Connecting-IP":testIp},body:JSON.stringify({type:"url",value:"https://example.com",requestId:crypto.randomUUID()})}),{...env,IDEMPOTENCY_HMAC_KEY:"synthetic-local-test-key-not-for-production"},"/v1/scans",{verify:async()=>({userId:a}),pipeline:async()=>{throw new Error("Must not call provider");}});
   check("Fourth scan rejected by API",response.status===429 && (await response.json()).error.code==="FREE_SCAN_LIMIT_REACHED");
   const stale=crypto.randomUUID();
   check("Recovery fixture reserved",await reserveScan(db,b,stale));
   await db.prepare("UPDATE scan_requests SET created_at = datetime('now', '-6 minutes') WHERE id = ? AND clerk_user_id = ?").bind(stale,b).run();
   let lateRejected=false;try{await finishScan(db,b,stale,true);}catch{lateRejected=true;}
   check("Late settlement rejected",lateRejected);
   check("Expired reservation restores allowance",(await allowance(db,b)).remaining===3);
   const expired=await db.prepare("SELECT status FROM scan_requests WHERE id = ?").bind(stale).first();
   check("Expired reservation marked failed",expired.status==="failed");
   check("Completed scans remain counted",(await allowance(db,a)).remaining===0);
   const fresh=crypto.randomUUID();
   check("Fresh reservation accepted after recovery",await reserveScan(db,b,fresh));
   check("Fresh reservation not expired",(await allowance(db,b)).remaining===2);
   const key=crypto.randomUUID();
   const testEnv={...env,TURNSTILE_SECRET_KEY:"synthetic",IDEMPOTENCY_HMAC_KEY:"synthetic-local-test-key-not-for-production"};
   let calls=0;
   const invoke=(requestId,value="https://example.com",fail=false,userId=b,turnstileToken="valid",options=testEnv)=>customerRoute(new Request("https://test.invalid/v1/scans",{method:"POST",headers:{Authorization:"Bearer synthetic","Content-Type":"application/json","CF-Connecting-IP":testIp},body:JSON.stringify({type:"url",value,requestId,turnstileToken})}),options,"/v1/scans",{verify:async()=>({userId}),turnstile:async token=>({verified:token==="valid"}),pipeline:async()=>{calls++;if(fail)throw Error("synthetic");return {status:"completed",intelligence:{status:"completed",malicious:false,threats:[]}};}});
   check("Missing verification rejected",(await invoke(key,"https://example.com",false,b,"")).status===403 && calls===0);
   check("Invalid verification rejected",(await invoke(key,"https://example.com",false,b,"invalid")).status===403 && calls===0);
   check("Missing secret fails closed",(await invoke(key,"https://example.com",false,b,"valid",{...testEnv,TURNSTILE_SECRET_KEY:""})).status===503 && calls===0);
   check("Verification failures preserve quota",(await allowance(db,b)).remaining===2);
   const results=await Promise.all(Array.from({length:10},()=>invoke(key)));
   check("Concurrent duplicate executes provider once",calls===1 && results.every(r=>r.status===200||r.status===409));
   check("Completed duplicate replay",(await invoke(key,"https://example.com",false,b,"")).status===200 && calls===1);
   check("Changed input conflict",(await invoke(key,"https://example.org")).status===409 && calls===1);
   const retry=crypto.randomUUID();
   check("Failed request releases quota",(await invoke(retry,"https://example.com",true)).status===503 && (await allowance(db,b)).remaining===1);
   check("Failed request can retry",(await invoke(retry)).status===200 && calls===3);
   check("Replay after exhaustion",(await invoke(key)).status===200 && (await allowance(db,b)).remaining===0);
   check("Customer scope isolated",(await invoke(key,"https://example.org",false,a)).status===429);
   const rateId=crypto.randomUUID();
   const probe=await Promise.all(Array.from({length:21},()=>enforceRateLimit(env,"scanUser",rateId)));
   check("Scanner rate limit admits exactly twenty",probe.filter(x=>x===null).length===20 && probe.filter(x=>x?.status===429).length===1);
   check("Rate limit returns retry header",Number(probe.find(x=>x?.status===429)?.headers.get("Retry-After"))>=1);
   check("Independent rate scope",await enforceRateLimit(env,"accountUser",rateId)===null);
   check("Missing rate binding fails closed",(await enforceRateLimit({},"scanUser",rateId)).status===503);
   check("Missing IP fails closed",(await enforceRateLimit(env,"scanIp",null)).status===503);
   // Use fresh identities and avoid starting saturation probes near a window boundary.
   const untilBoundary=60000-Date.now()%60000;
   if(untilBoundary<10000) await new Promise(resolve=>setTimeout(resolve,untilBoundary+100));
   const ip= "synthetic-"+crypto.randomUUID();
   const windowStart=Math.floor(Date.now()/60000);
   const ipProbe=await Promise.all(Array.from({length:61},()=>enforceRateLimit(env,"scanIp",ip)));
   const accountProbe=await Promise.all(Array.from({length:31},()=>enforceRateLimit(env,"accountUser",c)));
   const sameWindow=()=>Math.floor(Date.now()/60000)===windowStart;
   const saturated=(responses,limit)=>responses.filter(x=>x===null).length===limit && responses.filter(x=>x?.status===429).length===1;
   check("IP saturation",sameWindow() && saturated(ipProbe,60));
   check("Account saturation",sameWindow() && saturated(accountProbe,30));
   check("Independent IP addresses",await enforceRateLimit(env,"scanIp","synthetic-"+crypto.randomUUID())===null && (await enforceRateLimit(env,"scanIp",ip))?.status===429);
   check("Independent customers",await enforceRateLimit(env,"accountUser",crypto.randomUUID())===null && (await enforceRateLimit(env,"accountUser",c))?.status===429);
   await ensureUser(db,c);
   const before=await allowance(db,c);
   const customerProbe=await Promise.all(Array.from({length:20},()=>enforceRateLimit(env,"scanUser",c)));
   let verifierCalls=0, challengeCalls=0, providerCalls=0;
   const route=(address)=>customerRoute(new Request("https://test.invalid/v1/scans",{method:"POST",headers:{Authorization:"Bearer synthetic","Content-Type":"application/json","CF-Connecting-IP":address},body:JSON.stringify({type:"url",value:"https://example.com",requestId:crypto.randomUUID(),turnstileToken:"valid"})}),testEnv,"/v1/scans",{verify:async()=>{verifierCalls++;return {userId:c};},turnstile:async()=>{challengeCalls++;return {verified:true};},pipeline:async()=>{providerCalls++;return {status:"completed",intelligence:{status:"completed",malicious:false,threats:[]}};}});
   const denied=await route("synthetic-"+crypto.randomUUID());
   check("Scanner API rate rejection",sameWindow() && customerProbe.every(x=>x===null) && denied.status===429 && (await denied.json()).error.code==="RATE_LIMIT_EXCEEDED" && verifierCalls===1 && challengeCalls===0 && providerCalls===0);
   const after=await allowance(db,c);
   const records=await db.prepare("SELECT COUNT(*) AS count FROM scan_requests WHERE clerk_user_id=?").bind(c).first();
   check("Entitlement preservation",before.remaining===3 && after.remaining===3 && records.count===0);
   const blocked=await route(ip);
   check("Authentication flooding",sameWindow() && blocked.status===429 && (await blocked.json()).error.code==="RATE_LIMIT_EXCEEDED" && verifierCalls===1 && challengeCalls===0 && providerCalls===0);
  } catch(e){checks.push({name:"Integration execution",passed:false,error:e.message});}
  finally {
   await db.prepare("DELETE FROM scan_requests WHERE clerk_user_id IN (?,?,?)").bind(a,b,c).run();
   await db.prepare("DELETE FROM users WHERE clerk_user_id IN (?,?,?)").bind(a,b,c).run();
  }
  const passed=checks.every(c=>c.passed);
  return Response.json({passed,checks},{status:passed?200:500});
 }
};
