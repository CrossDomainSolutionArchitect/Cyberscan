import test from "node:test";
import assert from "node:assert/strict";

import { validateUrl } from "../src/validators/urlValidator.js";

test("accepts valid public HTTPS URLs", () => {
  const result = validateUrl("https://cyberscan.co.za");

  assert.equal(result.valid, true);
  assert.equal(result.hostname, "cyberscan.co.za");
  assert.equal(result.protocol, "https:");
});

test("accepts valid public HTTP URLs", () => {
  const result = validateUrl("http://example.com/path");

  assert.equal(result.valid, true);
});

test("rejects malformed URLs", () => {
  assert.equal(validateUrl("not-a-url").valid, false);
});

test("rejects empty URLs", () => {
  assert.equal(validateUrl("").valid, false);
  assert.equal(validateUrl("   ").valid, false);
});

test("rejects unsupported protocols", () => {
  assert.equal(validateUrl("ftp://example.com").valid, false);
  assert.equal(validateUrl("file:///etc/passwd").valid, false);
});

test("rejects embedded credentials", () => {
  assert.equal(
    validateUrl("https://user:password@example.com").valid,
    false
  );
});

test("rejects localhost", () => {
  assert.equal(validateUrl("http://localhost:3000").valid, false);
  assert.equal(validateUrl("http://admin.localhost").valid, false);
});

test("rejects private IPv4 addresses", () => {
  const addresses = [
    "127.0.0.1",
    "10.0.0.5",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254"
  ];

  for (const address of addresses) {
    assert.equal(
      validateUrl(`http://${address}`).valid,
      false,
      `Expected ${address} to be blocked`
    );
  }
});

test("rejects internal and reserved hostnames", () => {
  const hostnames = [
    "metadata.google.internal",
    "example.test",
    "service.local",
    "example.invalid"
  ];

  for (const hostname of hostnames) {
    assert.equal(
      validateUrl(`https://${hostname}`).valid,
      false,
      `Expected ${hostname} to be blocked`
    );
  }
});

test("rejects IPv6 address literals", () => {
  assert.equal(validateUrl("http://[::1]/").valid, false);
});

test("rejects excessively long URLs", () => {
  const url = "https://example.com/" + "a".repeat(2050);

  assert.equal(validateUrl(url).valid, false);
});

test("rejects non-string inputs", () => {
  assert.equal(validateUrl(null).valid, false);
  assert.equal(validateUrl(undefined).valid, false);
  assert.equal(validateUrl(123).valid, false);
});

test("normalizes valid URLs", () => {
  const result = validateUrl("  HTTPS://EXAMPLE.COM/path  ");

  assert.equal(result.valid, true);
  assert.equal(result.normalizedUrl, "https://example.com/path");
});
