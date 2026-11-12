import test from "node:test";
import assert from "node:assert/strict";
import { parseJsonBody } from "../src/utils/parseJsonBody.js";

function makeRequest(body, headers = {}) {
  return new Request("https://api.example.org/v1/scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body
  });
}

test("accepts valid JSON", async () => {
  const result = await parseJsonBody(
    makeRequest(JSON.stringify({ url: "https://example.org" }))
  );

  assert.equal(result.valid, true);
  assert.equal(result.data.url, "https://example.org");
});

test("accepts JSON with UTF-8 charset", async () => {
  const result = await parseJsonBody(
    makeRequest("{}", {
      "Content-Type": "application/json; charset=utf-8"
    })
  );

  assert.equal(result.valid, true);
});

test("rejects unsupported content type", async () => {
  const result = await parseJsonBody(
    makeRequest("{}", { "Content-Type": "text/plain" })
  );

  assert.equal(result.valid, false);
  assert.equal(result.status, 415);
});

test("rejects malformed JSON", async () => {
  const result = await parseJsonBody(
    makeRequest("{invalid}")
  );

  assert.equal(result.valid, false);
  assert.equal(result.status, 400);
});

test("rejects empty request bodies", async () => {
  const result = await parseJsonBody(
    makeRequest(null)
  );

  assert.equal(result.valid, false);
  assert.equal(result.status, 400);
});

test("rejects oversized request bodies", async () => {
  const result = await parseJsonBody(
    makeRequest(JSON.stringify({
      url: "a".repeat(5000)
    }))
  );

  assert.equal(result.valid, false);
  assert.equal(result.status, 413);
});

test("rejects oversized declared content length", async () => {
  const request = makeRequest("{}", {
    "Content-Length": "5000"
  });

  const result = await parseJsonBody(request);

  assert.equal(result.valid, false);
  assert.equal(result.status, 413);
});

test("rejects invalid content length", async () => {
  const request = makeRequest("{}", {
    "Content-Length": "invalid"
  });

  const result = await parseJsonBody(request);

  assert.equal(result.valid, false);
  assert.equal(result.status, 400);
});

test("rejects invalid UTF-8", async () => {
  const request = makeRequest(
    new Uint8Array([0xff, 0xfe])
  );

  const result = await parseJsonBody(request);

  assert.equal(result.valid, false);
  assert.equal(result.status, 400);
});
