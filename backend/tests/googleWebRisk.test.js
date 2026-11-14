import test from "node:test";
import assert from "node:assert/strict";
import {
  checkGoogleWebRisk
} from "../src/intelligence/providers/googleWebRisk.js";

const URL_TO_SCAN = "https://example.org";
const API_KEY = "test-key";

test("returns unavailable without credentials", async () => {
  const result = await checkGoogleWebRisk(
    URL_TO_SCAN,
    ""
  );

  assert.equal(result.status, "unavailable");
  assert.equal(result.classification, "unknown");
});

test("accepts a response with no known threats", async () => {
  const result = await checkGoogleWebRisk(
    URL_TO_SCAN,
    API_KEY,
    async () => Response.json({})
  );

  assert.equal(result.status, "completed");
  assert.equal(result.malicious, false);
  assert.equal(result.classification, "no_known_threat");
});

test("detects malware", async () => {
  const result = await checkGoogleWebRisk(
    URL_TO_SCAN,
    API_KEY,
    async () => Response.json({
      threat: {
        threatTypes: ["MALWARE"]
      }
    })
  );

  assert.equal(result.status, "completed");
  assert.equal(result.malicious, true);
  assert.deepEqual(result.threats, ["MALWARE"]);
});

test("detects multiple threat types", async () => {
  const result = await checkGoogleWebRisk(
    URL_TO_SCAN,
    API_KEY,
    async () => Response.json({
      threat: {
        threatTypes: [
          "MALWARE",
          "SOCIAL_ENGINEERING"
        ]
      }
    })
  );

  assert.deepEqual(result.threats, [
    "MALWARE",
    "SOCIAL_ENGINEERING"
  ]);
});

test("uses the correct Google API endpoint", async () => {
  let capturedUrl;
  let capturedOptions;

  await checkGoogleWebRisk(
    URL_TO_SCAN,
    API_KEY,
    async (url, options) => {
      capturedUrl = new URL(url);
      capturedOptions = options;
      return Response.json({});
    }
  );

  assert.equal(
    capturedUrl.origin,
    "https://webrisk.googleapis.com"
  );

  assert.equal(
    capturedUrl.pathname,
    "/v1/uris:search"
  );

  assert.equal(
    capturedUrl.searchParams.get("uri"),
    URL_TO_SCAN
  );

  assert.equal(
    capturedUrl.searchParams.get("key"),
    API_KEY
  );

  assert.deepEqual(
    capturedUrl.searchParams.getAll("threatTypes"),
    [
      "MALWARE",
      "SOCIAL_ENGINEERING",
      "UNWANTED_SOFTWARE"
    ]
  );

  assert.equal(capturedOptions.method, "GET");
  assert.equal(capturedOptions.redirect, "error");
});

test("handles provider HTTP errors", async () => {
  const result = await checkGoogleWebRisk(
    URL_TO_SCAN,
    API_KEY,
    async () => new Response(null, {
      status: 403
    })
  );

  assert.equal(result.status, "error");
  assert.equal(result.classification, "unknown");
});

test("handles network failures", async () => {
  const result = await checkGoogleWebRisk(
    URL_TO_SCAN,
    API_KEY,
    async () => {
      throw new Error("Network failure");
    }
  );

  assert.equal(result.status, "error");
});

test("rejects malformed provider responses", async () => {
  const result = await checkGoogleWebRisk(
    URL_TO_SCAN,
    API_KEY,
    async () => Response.json([])
  );

  assert.equal(result.status, "error");
});

test("rejects malformed threat data", async () => {
  const result = await checkGoogleWebRisk(
    URL_TO_SCAN,
    API_KEY,
    async () => Response.json({
      threat: {
        threatTypes: "MALWARE"
      }
    })
  );

  assert.equal(result.status, "error");
});

test("rejects unsupported threat types", async () => {
  const result = await checkGoogleWebRisk(
    URL_TO_SCAN,
    API_KEY,
    async () => Response.json({
      threat: {
        threatTypes: ["UNKNOWN_THREAT"]
      }
    })
  );

  assert.equal(result.status, "error");
});

test("removes duplicate threat types", async () => {
  const result = await checkGoogleWebRisk(
    URL_TO_SCAN,
    API_KEY,
    async () => Response.json({
      threat: {
        threatTypes: ["MALWARE", "MALWARE"]
      }
    })
  );

  assert.deepEqual(result.threats, ["MALWARE"]);
});
