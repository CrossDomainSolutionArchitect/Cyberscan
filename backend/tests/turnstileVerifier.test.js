import test from "node:test";
import assert from "node:assert/strict";

import {
  verifyTurnstile
} from "../src/security/turnstileVerifier.js";

const SECRET = "mock-secret";
const TOKEN = "mock-token";

function mockResponse(data, status = 200) {
  return async () =>
    new Response(JSON.stringify(data), { status });
}

function validResponse(overrides = {}) {
  return {
    success: true,
    hostname: "cyberscan.co.za",
    action: "scan_url",
    ...overrides
  };
}

test("accepts valid CyberScan Turnstile verification", async () => {
  const mockFetch = async (url, options) => {
    assert.equal(
      url,
      "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    );
    assert.equal(options.method, "POST");
    assert.equal(options.body.get("secret"), SECRET);
    assert.equal(options.body.get("response"), TOKEN);

    return new Response(JSON.stringify(validResponse()));
  };

  const result = await verifyTurnstile(TOKEN, SECRET, mockFetch);
  assert.equal(result.verified, true);
});

test("accepts approved www hostname", async () => {
  const result = await verifyTurnstile(
    TOKEN,
    SECRET,
    mockResponse(validResponse({
      hostname: "www.cyberscan.co.za"
    }))
  );

  assert.equal(result.verified, true);
});

test("rejects unsuccessful verification", async () => {
  const result = await verifyTurnstile(
    TOKEN,
    SECRET,
    mockResponse(validResponse({ success: false }))
  );

  assert.equal(result.verified, false);
});

test("rejects unapproved hostname", async () => {
  const result = await verifyTurnstile(
    TOKEN,
    SECRET,
    mockResponse(validResponse({
      hostname: "attacker.example"
    }))
  );

  assert.equal(result.verified, false);
});

test("rejects missing hostname", async () => {
  const data = validResponse();
  delete data.hostname;

  const result = await verifyTurnstile(
    TOKEN,
    SECRET,
    mockResponse(data)
  );

  assert.equal(result.verified, false);
});

test("rejects incorrect action", async () => {
  const result = await verifyTurnstile(
    TOKEN,
    SECRET,
    mockResponse(validResponse({
      action: "login"
    }))
  );

  assert.equal(result.verified, false);
});

test("rejects missing action", async () => {
  const data = validResponse();
  delete data.action;

  const result = await verifyTurnstile(
    TOKEN,
    SECRET,
    mockResponse(data)
  );

  assert.equal(result.verified, false);
});

test("fails closed when secret is missing", async () => {
  let called = false;

  const result = await verifyTurnstile(
    TOKEN,
    "",
    async () => {
      called = true;
      throw new Error("Should not execute");
    }
  );

  assert.equal(result.verified, false);
  assert.equal(called, false);
});

test("rejects missing token", async () => {
  const result = await verifyTurnstile(
    "",
    SECRET,
    async () => {
      throw new Error("Should not execute");
    }
  );

  assert.equal(result.verified, false);
});

test("rejects oversized token", async () => {
  const result = await verifyTurnstile(
    "x".repeat(2049),
    SECRET,
    async () => {
      throw new Error("Should not execute");
    }
  );

  assert.equal(result.verified, false);
});

test("handles provider HTTP errors", async () => {
  const result = await verifyTurnstile(
    TOKEN,
    SECRET,
    mockResponse({ success: false }, 503)
  );

  assert.equal(result.verified, false);
});

test("handles network failures", async () => {
  const result = await verifyTurnstile(
    TOKEN,
    SECRET,
    async () => {
      throw new Error("Simulated network failure");
    }
  );

  assert.equal(result.verified, false);
});

test("rejects malformed provider responses", async () => {
  const result = await verifyTurnstile(
    TOKEN,
    SECRET,
    mockResponse(null)
  );

  assert.equal(result.verified, false);
});
