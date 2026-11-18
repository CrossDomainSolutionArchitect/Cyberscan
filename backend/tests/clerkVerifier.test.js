import test from "node:test";
import assert from "node:assert/strict";
import {verifyClerkToken} from "../src/security/clerkVerifier.js";
test("valid signed Clerk token, forged signature, expiration and origin",async()=>{
 const keys=await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
 const jwk=await crypto.subtle.exportKey("jwk",keys.publicKey); jwk.kid="test";
 const fetcher=async()=>Response.json({keys:[jwk]});
 const enc=x=>Buffer.from(JSON.stringify(x)).toString("base64url");
 const now=1700000000;
 const sign=async(overrides={})=>{const msg=enc({alg:"RS256",kid:"test"})+"."+enc({iss:"https://clerk.cyberscan.co.za",azp:"https://cyberscan.co.za",sub:"user_123",sid:"sess_123",iat:now,nbf:now,exp:now+60,...overrides});return msg+"."+Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",keys.privateKey,new TextEncoder().encode(msg))).toString("base64url");};
 const token=await sign();
 assert.deepEqual(await verifyClerkToken(token,fetcher,now),{userId:"user_123",sessionId:"sess_123"});
 assert.equal(await verifyClerkToken(token.split(".").slice(0,2).join(".")+".AAAA",fetcher,now),null);
 assert.equal(await verifyClerkToken(await sign({exp:now}),fetcher,now),null);
 assert.equal(await verifyClerkToken(await sign({azp:"https://evil.example"}),fetcher,now),null);
});
