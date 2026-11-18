import test from "node:test";
import assert from "node:assert/strict";
import {verifyClerkToken} from "../src/security/clerkVerifier.js";
import {verifyTurnstile} from "../src/security/turnstileVerifier.js";
import {resolveHostname} from "../src/security/dnsResolver.js";
import {checkGoogleWebRisk} from "../src/intelligence/providers/googleWebRisk.js";

const now=1700000000;
const enc=x=>Buffer.from(JSON.stringify(x)).toString("base64url");
const token=enc({alg:"RS256",kid:"test"})+"."+enc({iss:"https://clerk.cyberscan.co.za",azp:"https://cyberscan.co.za",sub:"user_123",sid:"sess_123",iat:now,nbf:now,exp:now+60})+".AAAA";

for(const status of [301,302,303,307,308]) {
 for(const [name,invoke] of [
  ["Clerk",async f=>assert.rejects(()=>verifyClerkToken(token,f,now),/JWKS unavailable/)],
  ["Turnstile",async f=>assert.equal((await verifyTurnstile("synthetic","synthetic",f)).verified,false)],
  ["DNS",async f=>assert.rejects(()=>resolveHostname("example.com",f),/DNS A lookup failed/)],
  ["Web Risk",async f=>assert.equal((await checkGoogleWebRisk("https://example.com","synthetic",f)).status,"error")]
 ]) test(name+" rejects HTTP "+status+" without parsing or following",async()=>{
  let calls=0, parses=0;
  await invoke(async (url,options)=>{
   calls++;
   assert.equal(options.redirect,"manual");
   assert.ok(options.signal instanceof AbortSignal);
   return {status,ok:false,headers:new Headers({Location:"https://redirect.invalid"}),json:async()=>{parses++;throw Error("Unexpected parsing");}};
  });
  assert.equal(calls,1);
  assert.equal(parses,0);
 });
}
