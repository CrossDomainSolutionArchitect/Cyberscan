import test from "node:test";
import assert from "node:assert/strict";
import {
  validateScanRequest
} from "../src/validators/scanRequestValidator.js";

test("accepts a valid HTTPS scan request", () => {
  const result = validateScanRequest({
    url: "https://example.org"
  });

  assert.equal(result.valid, true);
  assert.equal(result.url, "https://example.org/");
  assert.equal(result.hostname, "example.org");
});

test("accepts a valid HTTP scan request", () => {
  const result = validateScanRequest({
    url: "http://example.org"
  });

  assert.equal(result.valid, true);
  assert.equal(result.protocol, "http:");
});

test("rejects a null request body", () => {
  const result = validateScanRequest(null);
  assert.equal(result.valid, false);
});

test("rejects an array request body", () => {
  const result = validateScanRequest([]);
  assert.equal(result.valid, false);
});

test("rejects a string request body", () => {
  const result = validateScanRequest("https://example.org");
  assert.equal(result.valid, false);
});

test("rejects a missing URL field", () => {
  const result = validateScanRequest({});
  assert.equal(result.valid, false);
});

test("rejects unexpected request fields", () => {
  const result = validateScanRequest({
    url: "https://example.org",
    admin: true
  });

  assert.equal(result.valid, false);
});

test("rejects private network URLs", () => {
  const result = validateScanRequest({
    url: "http://192.168.1.1"
  });

  assert.equal(result.valid, false);
});

test("rejects localhost URLs", () => {
  const result = validateScanRequest({
    url: "http://localhost"
  });

  assert.equal(result.valid, false);
});

test("rejects unsupported URL protocols", () => {
  const result = validateScanRequest({
    url: "file:///etc/passwd"
  });

  assert.equal(result.valid, false);
});

test("rejects URLs containing credentials", () => {
  const result = validateScanRequest({
    url: "https://user:pass@example.org"
  });

  assert.equal(result.valid, false);
});
