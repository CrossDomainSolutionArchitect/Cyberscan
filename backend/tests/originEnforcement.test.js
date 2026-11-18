import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const env = { ALLOWED_ORIGINS: "https://cyberscan.co.za,https://www.cyberscan.co.za" };
for (const origin of ["https://example.com", "https://cyberscan.co.za.example.com", "http://cyberscan.co.za", "null", ""]) {
  test("Reject explicit untrusted origin: " + JSON.stringify(origin), async () => {
    for (const [path, method] of [["/v1/health", "GET"], ["/v1/me", "GET"], ["/v1/scans", "POST"]]) {
      const response = await worker.fetch(new Request("https://api.example.com" + path, {method, headers: {Origin: origin}}), env);
      assert.equal(response.status, 403);
      assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
      assert.equal((await response.json()).error.code, "CORS_ORIGIN_DENIED");
    }
  });
}
for (const origin of ["https://cyberscan.co.za", "https://www.cyberscan.co.za"]) {
  test("Allow trusted origin: " + origin, async () => {
    const response = await worker.fetch(new Request("https://api.example.com/v1/health", {headers: {Origin: origin}}), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
    assert.equal(response.headers.get("Vary"), "Origin");
  });
}
test("Preserve requests without Origin", async () => {
  const response = await worker.fetch(new Request("https://api.example.com/v1/health"), env);
  assert.equal(response.status, 200);
});
