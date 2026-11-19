import { scheduleQuotaAlarm, scheduleQuotaAlarmInTransaction } from "../src/security/quotaAlarm.js";
import { processQuotaAlarm } from "../src/security/quotaAlarmLifecycle.js";

export class AlarmDiagnostic {
  constructor(state) { this.storage = state.storage; }
  async alarm() {
    await processQuotaAlarm(this.storage);
  }
  async fetch(request) {
    const s = this.storage;
    const path = new URL(request.url).pathname;
    if (path === "/status") {
      return Response.json({ alarm: await s.getAlarm(), records: [...await s.list({prefix:"quota:"})] });
    }
    if (path !== "/start" || request.method !== "POST") return new Response(null,{status:404});
    const checks = [];
    const base = Date.now() + 120000;
    try {
      await Promise.all([scheduleQuotaAlarm(s,base+1000),scheduleQuotaAlarm(s,base),scheduleQuotaAlarm(s,base+2000)]);
      checks.push({id:"ALARM-001",passed:await s.getAlarm()===base});
      await scheduleQuotaAlarm(s,base+3000);
      checks.push({id:"ALARM-002",passed:await s.getAlarm()===base});
      await scheduleQuotaAlarm(s,base-1000);
      checks.push({id:"ALARM-003",passed:await s.getAlarm()===base-1000});
      let rolledBack=false;
      try {
        await s.transaction(async tx=>{
          await tx.put("quota:rollback",{count:1,expiresAt:base-2000});
          await scheduleQuotaAlarmInTransaction(tx,base-2000);
          throw new Error("intentional rollback");
        });
      } catch(e) { if(e.message!=="intentional rollback") throw e; rolledBack=true; }
      checks.push({id:"ALARM-004",passed:rolledBack && await s.get("quota:rollback")===undefined && await s.getAlarm()===base-1000});
      const first=Date.now()+3000, second=first+15000;
      await s.transaction(async tx=>{
        await tx.put("quota:first",{count:1,expiresAt:first});
        await tx.put("quota:second",{count:1,expiresAt:second});
        await tx.setAlarm(first);
      });
      return Response.json({checks,first,second});
    } catch(e) {
      await s.deleteAlarm();
      await s.deleteAll();
      return Response.json({checks,error:e.message},{status:500});
    }
  }
}
export default {
  async fetch(request,env) {
    if(request.method!=="POST" || new URL(request.url).pathname!=="/test") return new Response(null,{status:404});
    const stub=env.ALARM_TEST.get(env.ALARM_TEST.idFromName(crypto.randomUUID()));
    const started=await stub.fetch("https://internal/start",{method:"POST"});
    const data=await started.json();
    if(!started.ok) return Response.json(data,{status:500});
    const checks=data.checks;
    const status=async()=> (await stub.fetch("https://internal/status")).json();
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    let mid;
    while(Date.now()<data.second-2000) {
      mid=await status();
      if(!mid.records.some(([key])=>key==="quota:first")) break;
      await wait(250);
    }
    mid=mid??await status();
    checks.push({id:"ALARM-005",passed:!mid.records.some(([key])=>key==="quota:first")});
    checks.push({id:"ALARM-006",passed:mid.records.some(([key,value])=>key==="quota:second"&&value.expiresAt===data.second)});
    checks.push({id:"ALARM-007",passed:mid.alarm===data.second});
    let final;
    do {
      final=await status();
      if(final.records.length===0&&final.alarm===null) break;
      await wait(250);
    } while(Date.now()<data.second+15000);
    checks.push({id:"ALARM-008",passed:final.records.length===0&&final.alarm===null});
    return Response.json({passed:checks.every(c=>c.passed),checks,mid,final});
  }
};
