import test from "node:test";
import assert from "node:assert/strict";
import { checkDnsSecurity } from "../src/security/dnsSecurityService.js";

function mockDns(address) {
  return async (url) => {
    const type = new URL(url).searchParams.get("type");

    return Response.json({
      Status: 0,
      Answer: type === "A"
        ? [{ type: 1, data: address }]
        : []
    });
  };
}

test("accepts DNS results containing public IPv4", async () => {
  const result = await checkDnsSecurity(
    "example.com",
    mockDns("8.8.8.8")
  );

  assert.equal(result.safe, true);
  assert.deepEqual(result.addresses, ["8.8.8.8"]);
});

test("rejects DNS results containing private IPv4", async () => {
  const result = await checkDnsSecurity(
    "example.com",
    mockDns("127.0.0.1")
  );

  assert.equal(result.safe, false);
});

test("rejects malformed DNS addresses", async () => {
  const result = await checkDnsSecurity(
    "example.com",
    mockDns("not-an-ip")
  );

  assert.equal(result.safe, false);
});

test("rejects IPv6 DNS addresses", async () => {
  const result = await checkDnsSecurity(
    "example.com",
    mockDns("::1")
  );

  assert.equal(result.safe, false);
});

test("rejects reserved hostnames before DNS lookup", async () => {
  let called = false;

  const mockFetch = async () => {
    called = true;
    throw new Error("DNS lookup should not occur");
  };

  const result = await checkDnsSecurity(
    "localhost",
    mockFetch
  );

  assert.equal(result.safe, false);
  assert.equal(called, false);
});

test("fails closed when DNS resolution throws", async () => {
  const mockFetch = async () => {
    throw new Error("Network unavailable");
  };

  const result = await checkDnsSecurity(
    "example.com",
    mockFetch
  );

  assert.equal(result.safe, false);
});
