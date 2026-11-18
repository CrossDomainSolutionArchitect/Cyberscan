import test from "node:test";
import assert from "node:assert/strict";
import {customerRoute} from "../src/services/customerRoutes.js";
test("missing token rejected before database access",async()=>assert.equal((await customerRoute(new Request("https://example.com/v1/me"),{},"/v1/me")).status,401));
test("failed verification unavailable",async()=>assert.equal((await customerRoute(new Request("https://example.com/v1/me",{headers:{Authorization:"Bearer test"}}),{},"/v1/me",{verify:async()=>{throw Error();}})).status,503));
test("verified identity without DB fails closed",async()=>assert.equal((await customerRoute(new Request("https://example.com/v1/me",{headers:{Authorization:"Bearer test"}}),{},"/v1/me",{verify:async()=>({userId:"user_1"})})).status,503));
