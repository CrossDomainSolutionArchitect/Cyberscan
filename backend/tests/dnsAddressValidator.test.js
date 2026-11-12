import test from "node:test";
import assert from "node:assert/strict";
import { validateDnsAddresses } from "../src/security/dnsAddressValidator.js";

test("rejects empty DNS address results", () => {
  assert.equal(validateDnsAddresses([]).valid, false);
  assert.equal(validateDnsAddresses(null).valid, false);
});

test("rejects malformed DNS IP addresses", () => {
  assert.equal(validateDnsAddresses(["not-an-ip"]).valid, false);
  assert.equal(validateDnsAddresses([123]).valid, false);
});

test("rejects private IPv4 DNS addresses", () => {
  const addresses = [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254"
  ];

  for (const address of addresses) {
    assert.equal(
      validateDnsAddresses([address]).valid,
      false,
      `Private address ${address} must be rejected`
    );
  }
});

test("rejects IPv6 DNS addresses", () => {
  assert.equal(validateDnsAddresses(["::1"]).valid, false);
  assert.equal(
    validateDnsAddresses(["2606:4700:4700::1111"]).valid,
    false
  );
});

test("accepts valid public IPv4 DNS addresses", () => {
  const result = validateDnsAddresses(["8.8.8.8", "1.1.1.1"]);

  assert.equal(result.valid, true);
  assert.deepEqual(result.addresses, ["8.8.8.8", "1.1.1.1"]);
});

test("rejects mixed public and private DNS results", () => {
  const result = validateDnsAddresses([
    "8.8.8.8",
    "10.0.0.1"
  ]);

  assert.equal(result.valid, false);
});

test("removes duplicate public IPv4 addresses", () => {
  const result = validateDnsAddresses([
    "8.8.8.8",
    "8.8.8.8"
  ]);

  assert.equal(result.valid, true);
  assert.deepEqual(result.addresses, ["8.8.8.8"]);
});
