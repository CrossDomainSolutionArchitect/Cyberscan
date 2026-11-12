import test from "node:test";
import assert from "node:assert/strict";
import { createThreatResult } from "../src/intelligence/threatResult.js";

test("creates a completed clean threat result", () => {
  const result = createThreatResult({
    provider: "test-provider",
    status: "completed"
  });

  assert.equal(result.provider, "test-provider");
  assert.equal(result.status, "completed");
  assert.equal(result.malicious, false);
  assert.deepEqual(result.threats, []);
  assert.ok(result.checkedAt);
});

test("creates a malicious threat result", () => {
  const result = createThreatResult({
    provider: "test-provider",
    status: "completed",
    malicious: true,
    threats: ["malware", "phishing"]
  });

  assert.equal(result.malicious, true);
  assert.deepEqual(result.threats, ["malware", "phishing"]);
});

test("supports unavailable provider status", () => {
  const result = createThreatResult({
    provider: "test-provider",
    status: "unavailable"
  });

  assert.equal(result.status, "unavailable");
});

test("supports provider errors", () => {
  const result = createThreatResult({
    provider: "test-provider",
    status: "error",
    error: "Provider timeout"
  });

  assert.equal(result.status, "error");
  assert.equal(result.error, "Provider timeout");
});

test("rejects missing provider names", () => {
  assert.throws(
    () => createThreatResult({
      provider: "",
      status: "completed"
    }),
    /Threat provider is required/
  );
});

test("rejects invalid result statuses", () => {
  assert.throws(
    () => createThreatResult({
      provider: "test-provider",
      status: "unknown"
    }),
    /Invalid threat result status/
  );
});

test("rejects invalid threat data", () => {
  assert.throws(
    () => createThreatResult({
      provider: "test-provider",
      status: "completed",
      malicious: "yes",
      threats: "malware"
    }),
    /Invalid threat result data/
  );
});

test("classifies confirmed threat matches as malicious", () => {
  const result = createThreatResult({
    provider: "test-provider",
    status: "completed",
    malicious: true,
    threats: ["MALWARE"]
  });

  assert.equal(result.classification, "malicious");
});

test("classifies completed lookups without matches correctly", () => {
  const result = createThreatResult({
    provider: "test-provider",
    status: "completed",
    malicious: false,
    threats: []
  });

  assert.equal(result.classification, "no_known_threat");
});

test("classifies unavailable providers as unknown", () => {
  const result = createThreatResult({
    provider: "test-provider",
    status: "unavailable"
  });

  assert.equal(result.classification, "unknown");
});

test("classifies provider errors as unknown", () => {
  const result = createThreatResult({
    provider: "test-provider",
    status: "error",
    error: "Provider timeout"
  });

  assert.equal(result.classification, "unknown");
});

test("rejects malicious findings on failed lookups", () => {
  assert.throws(
    () => createThreatResult({
      provider: "test-provider",
      status: "error",
      malicious: true,
      threats: ["MALWARE"]
    }),
    /Incomplete lookups cannot contain confirmed threats/
  );
});

test("rejects threat findings on unavailable lookups", () => {
  assert.throws(
    () => createThreatResult({
      provider: "test-provider",
      status: "unavailable",
      threats: ["PHISHING"]
    }),
    /Incomplete lookups cannot contain confirmed threats/
  );
});

test("rejects malicious flag without threat findings", () => {
  assert.throws(
    () => createThreatResult({
      provider: "test-provider",
      status: "completed",
      malicious: true,
      threats: []
    }),
    /Threat detection flag must match threat findings/
  );
});

test("rejects threat findings when malicious is false", () => {
  assert.throws(
    () => createThreatResult({
      provider: "test-provider",
      status: "completed",
      malicious: false,
      threats: ["MALWARE"]
    }),
    /Threat detection flag must match threat findings/
  );
});
