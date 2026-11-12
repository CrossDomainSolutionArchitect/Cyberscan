import test from "node:test";
import assert from "node:assert/strict";
import {
  checkGoogleSafeBrowsing
} from "../src/intelligence/providers/googleSafeBrowsing.js";

const URL = "https://example.org/";
const KEY = "test-api-key";

test("returns unavailable without an API key", async () => {
  const result = await checkGoogleSafeBrowsing(URL, "");

  assert.equal(result.status, "unavailable");
  assert.equal(result.malicious, false);
});

test("handles a response with no threat matches", async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({})
  });

  const result = await checkGoogleSafeBrowsing(
    URL, KEY, mockFetch
  );

  assert.equal(result.status, "completed");
  assert.equal(result.malicious, false);
  assert.deepEqual(result.threats, []);
});

test("detects reported malware and phishing", async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      matches: [
        { threatType: "MALWARE" },
        { threatType: "SOCIAL_ENGINEERING" }
      ]
    })
  });

  const result = await checkGoogleSafeBrowsing(
    URL, KEY, mockFetch
  );

  assert.equal(result.status, "completed");
  assert.equal(result.malicious, true);
  assert.deepEqual(result.threats, [
    "MALWARE",
    "SOCIAL_ENGINEERING"
  ]);
});

test("uses the expected API request", async () => {
  let capturedEndpoint;
  let capturedOptions;

  const mockFetch = async (endpoint, options) => {
    capturedEndpoint = endpoint;
    capturedOptions = options;

    return {
      ok: true,
      json: async () => ({})
    };
  };

  await checkGoogleSafeBrowsing(URL, KEY, mockFetch);

  const endpoint = new globalThis.URL(capturedEndpoint);
  const body = JSON.parse(capturedOptions.body);

  assert.equal(endpoint.searchParams.get("key"), KEY);
  assert.equal(capturedOptions.method, "POST");
  assert.equal(capturedOptions.redirect, "error");
  assert.deepEqual(body.threatInfo.threatEntries, [
    { url: URL }
  ]);
});

test("handles provider HTTP errors", async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 429
  });

  const result = await checkGoogleSafeBrowsing(
    URL, KEY, mockFetch
  );

  assert.equal(result.status, "error");
  assert.match(result.error, /429/);
});

test("rejects malformed provider responses", async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({ matches: "invalid" })
  });

  const result = await checkGoogleSafeBrowsing(
    URL, KEY, mockFetch
  );

  assert.equal(result.status, "error");
});

test("handles network failures", async () => {
  const mockFetch = async () => {
    throw new Error("Network unavailable");
  };

  const result = await checkGoogleSafeBrowsing(
    URL, KEY, mockFetch
  );

  assert.equal(result.status, "error");
});

test("rejects threat matches without a threat type", async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      matches: [{}]
    })
  });

  const result = await checkGoogleSafeBrowsing(
    URL, KEY, mockFetch
  );

  assert.equal(result.status, "error");
  assert.equal(result.malicious, false);
});

test("rejects unsupported threat types", async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      matches: [
        { threatType: "UNKNOWN_THREAT" }
      ]
    })
  });

  const result = await checkGoogleSafeBrowsing(
    URL, KEY, mockFetch
  );

  assert.equal(result.status, "error");
  assert.equal(result.malicious, false);
});

test("rejects null threat-match entries", async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      matches: [null]
    })
  });

  const result = await checkGoogleSafeBrowsing(
    URL, KEY, mockFetch
  );

  assert.equal(result.status, "error");
  assert.equal(result.malicious, false);
});
