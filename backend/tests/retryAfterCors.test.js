import test from "node:test";
import assert from "node:assert/strict";
import {applyCors} from "../src/middleware/cors.js";

const env = {ALLOWED_ORIGINS:"https://cyberscan.co.za,https://www.cyberscan.co.za"};
for (const origin of ["https://cyberscan.co.za","https://www.cyberscan.co.za","https://example.com",null]) {
  test("Retry-After exposure for "+origin, () => {
    const request = new Request("https://api.example.com/v1/scans",{headers:origin ? {Origin:origin} : {}});
    const response = applyCors(request,new Response("limited",{status:429,headers:{"Retry-After":"55"}}),env);
    const trusted = origin !== null && env.ALLOWED_ORIGINS.split(",").includes(origin);
    assert.equal(response.status,429);
    assert.equal(response.headers.get("Retry-After"),"55");
    assert.equal(response.headers.get("Access-Control-Expose-Headers"),trusted ? "Retry-After" : null);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"),trusted ? origin : null);
  });
}
test("Do not expose absent Retry-After", () => {
  const request = new Request("https://api.example.com/v1/health",{headers:{Origin:"https://cyberscan.co.za"}});
  assert.equal(applyCors(request,new Response("ok"),env).headers.get("Access-Control-Expose-Headers"),null);
});
