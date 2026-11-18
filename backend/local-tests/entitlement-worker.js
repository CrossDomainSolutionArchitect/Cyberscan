import {ensureUser, allowance, reserveScan, finishScan} from "../src/services/entitlements.js";
import {customerRoute} from "../src/services/customerRoutes.js";
export default {
 async fetch(request, env) {
  if (new URL(request.url).pathname !== "/test" || request.method !== "POST") return new Response("Not found",{status:404});
  const db=env.DB, a="user_test_"+crypto.randomUUID(), b="user_test_"+crypto.randomUUID();
  const checks=[];
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
   const response=await customerRoute(new Request("https://test.invalid/v1/scans",{method:"POST",headers:{Authorization:"Bearer synthetic","Content-Type":"application/json"},body:JSON.stringify({type:"url",value:"https://example.com"})}),env,"/v1/scans",{verify:async()=>({userId:a}),pipeline:async()=>{throw new Error("Must not call provider");}});
   check("Fourth scan rejected by API",response.status===429 && (await response.json()).error.code==="FREE_SCAN_LIMIT_REACHED");
  } catch(e){checks.push({name:"Integration execution",passed:false,error:e.message});}
  finally {
   await db.prepare("DELETE FROM scan_requests WHERE clerk_user_id IN (?,?)").bind(a,b).run();
   await db.prepare("DELETE FROM users WHERE clerk_user_id IN (?,?)").bind(a,b).run();
  }
  const passed=checks.every(c=>c.passed);
  return Response.json({passed,checks},{status:passed?200:500});
 }
};
