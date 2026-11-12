import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

function makeRequest(path, options = {}) {
  return new Request(`http://localhost:8787${path}`, options);
}

test("GET /v1/health returns HTTP 200", async () => {
  const response = await worker.fetch(makeRequest("/v1/health"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.status, "ok");
  assert.equal(body.data.service, "cyberscan-api");
});

test("Unknown endpoint returns HTTP 404", async () => {
  const response = await worker.fetch(makeRequest("/v1/invalid"));
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "NOT_FOUND");
});

test("POST /v1/health returns HTTP 405", async () => {
  const response = await worker.fetch(
    makeRequest("/v1/health", { method: "POST" })
  );

  const body = await response.json();

  assert.equal(response.status, 405);
  assert.equal(body.error.code, "METHOD_NOT_ALLOWED");
});

test("API responses contain security headers", async () => {
  for (const path of ["/v1/health", "/v1/invalid"]) {
    const response = await worker.fetch(makeRequest(path));

    assert.equal(
      response.headers.get("X-Content-Type-Options"),
      "nosniff"
    );
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
    assert.equal(response.headers.get("X-Frame-Options"), "DENY");
  }
});

test("Approved origin receives CORS permission", async () => {
  const response = await worker.fetch(
    makeRequest("/v1/health", {
      headers: { Origin: "https://cyberscan.co.za" }
    })
  );

  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    "https://cyberscan.co.za"
  );
});

test("Unapproved origin receives no CORS permission", async () => {
  const response = await worker.fetch(
    makeRequest("/v1/health", {
      headers: { Origin: "https://untrusted.example" }
    })
  );

  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    null
  );
});

test("Approved preflight returns HTTP 204", async () => {
  const response = await worker.fetch(
    makeRequest("/v1/health", {
      method: "OPTIONS",
      headers: {
        Origin: "https://cyberscan.co.za",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type"
      }
    })
  );

  assert.equal(response.status, 204);
});

test("Unapproved preflight returns HTTP 403", async () => {
  const response = await worker.fetch(
    makeRequest("/v1/health", {
      method: "OPTIONS",
      headers: {
        Origin: "https://untrusted.example",
        "Access-Control-Request-Method": "POST"
      }
    })
  );

  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, "CORS_ORIGIN_DENIED");
  assert.equal(
    response.headers.get("X-Content-Type-Options"),
    "nosniff"
  );
});

test("Unsupported preflight header returns HTTP 403", async () => {
  const response = await worker.fetch(
    makeRequest("/v1/health", {
      method: "OPTIONS",
      headers: {
        Origin: "https://cyberscan.co.za",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Authorization"
      }
    })
  );

  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, "CORS_HEADERS_DENIED");
});
