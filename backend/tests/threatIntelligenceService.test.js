import test from "node:test";
import assert from "node:assert/strict";

import {
  runThreatIntelligence
} from "../src/intelligence/threatIntelligenceService.js";

import {
  createThreatResult
} from "../src/intelligence/threatResult.js";

const URL_TO_CHECK = "https://example.org/";
const ENV = {
  GOOGLE_WEB_RISK_API_KEY: "mock-test-key"
};

test("returns a completed result for a URL with no known threats", async () => {
  const mockProvider = async () =>
    createThreatResult({
      provider: "google-web-risk",
      status: "completed",
      malicious: false,
      threats: []
    });

  const result = await runThreatIntelligence(
    URL_TO_CHECK,
    ENV,
    mockProvider
  );

  assert.equal(result.status, "completed");
  assert.equal(result.classification, "no_known_threat");
  assert.equal(result.malicious, false);
  assert.deepEqual(result.threats, []);
});

test("returns malicious classification when threats are detected", async () => {
  const mockProvider = async () =>
    createThreatResult({
      provider: "google-web-risk",
      status: "completed",
      malicious: true,
      threats: ["MALWARE"]
    });

  const result = await runThreatIntelligence(
    URL_TO_CHECK,
    ENV,
    mockProvider
  );

  assert.equal(result.status, "completed");
  assert.equal(result.classification, "malicious");
  assert.equal(result.malicious, true);
  assert.deepEqual(result.threats, ["MALWARE"]);
});

test("returns unavailable when credentials are missing", async () => {
  let providerCalled = false;

  const mockProvider = async () => {
    providerCalled = true;
    throw new Error("Provider should not be called");
  };

  const result = await runThreatIntelligence(
    URL_TO_CHECK,
    {},
    mockProvider
  );

  assert.equal(result.status, "unavailable");
  assert.equal(result.classification, "unknown");
  assert.equal(providerCalled, false);
});

test("handles unexpected provider exceptions", async () => {
  const mockProvider = async () => {
    throw new Error("Simulated provider failure");
  };

  const result = await runThreatIntelligence(
    URL_TO_CHECK,
    ENV,
    mockProvider
  );

  assert.equal(result.status, "error");
  assert.equal(result.classification, "unknown");
  assert.equal(result.malicious, false);
  assert.deepEqual(result.threats, []);
  assert.equal(result.error, "Threat intelligence service failed.");
});

test("forwards URL and API key to the provider", async () => {
  let receivedUrl;
  let receivedKey;

  const mockProvider = async (url, apiKey) => {
    receivedUrl = url;
    receivedKey = apiKey;

    return createThreatResult({
      provider: "google-web-risk",
      status: "completed",
      malicious: false,
      threats: []
    });
  };

  await runThreatIntelligence(
    URL_TO_CHECK,
    ENV,
    mockProvider
  );

  assert.equal(receivedUrl, URL_TO_CHECK);
  assert.equal(receivedKey, ENV.GOOGLE_WEB_RISK_API_KEY);
});
