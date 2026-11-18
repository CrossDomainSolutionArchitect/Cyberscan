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

test("accepts public IPv6 and dual-stack DNS results", () => {
  for (const address of ["2606:4700:4700::1111", "2606:4700:10::6814:179a", "2606:4700:10::ac42:93f3", "2606:4700:0010:0000:0000:0000:6814:179a"]) {
    assert.equal(validateDnsAddresses([address]).valid, true, address);
    assert.equal(validateDnsAddresses(["104.20.23.154", address]).valid, true, address);
  }
});

test("rejects special-purpose IPv6 and mixed unsafe DNS results", () => {
  for (const address of ["::", "::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "64:ff9b::808:808", "fc00::1", "fd00::1", "fe80::1", "ff02::1", "2001:db8::1", "2001::1", "2001:2::1", "2002:7f00:1::1", "3fff::1", "2606:4700::1%eth0", "4000::1"]) {
    assert.equal(validateDnsAddresses([address]).valid, false, address);
    assert.equal(validateDnsAddresses(["8.8.8.8", address]).valid, false, address);
  }
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
