import test from "node:test";
import assert from "node:assert/strict";
import {enforceRateLimit} from "../src/security/rateLimiter.js";
function mock(status,data,inspect=()=>{}) {
 return {QUOTA_COUNTER:{idFromName:key=>key,get:key=>({fetch:async(url,init)=>{inspect(key,JSON.parse(init.body));return Response.json(data,{status});}})}};
}
for(const [scope,limit] of [["scanIp",60],["scanUser",20],["accountUser",30]]) {
 test("rate policy "+scope,async()=>assert.equal(await enforceRateLimit(mock(200,{allowed:true},(key,body)=>{assert.match(key,/^[a-f0-9]{64}$/);assert.equal(body.key,key);assert.equal(body.limit,limit);assert.equal(body.windowSeconds,60);}),scope,"synthetic"),null));
}
test("rate limit returns 429 and retry header",async()=>{const r=await enforceRateLimit(mock(429,{allowed:false,retryAfterSeconds:15}),"scanUser","a");assert.equal(r.status,429);assert.equal(r.headers.get("Retry-After"),"15");});
test("missing rate binding fails closed",async()=>assert.equal((await enforceRateLimit({},"scanUser","a")).status,503));
test("malformed rate response fails closed",async()=>assert.equal((await enforceRateLimit(mock(200,{allowed:"true"}),"scanUser","a")).status,503));
test("missing identity fails closed",async()=>assert.equal((await enforceRateLimit(mock(200,{allowed:true}),"scanIp",null)).status,503));
