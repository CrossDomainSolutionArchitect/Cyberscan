import test from "node:test";
import assert from "node:assert/strict";
import { resolveHostname } from "../src/security/dnsResolver.js";

test("resolves IPv4 and IPv6 DNS records", async () => {
  const mockFetch = async (url) => {
    const type = new URL(url).searchParams.get("type");

    return Response.json({
      Status: 0,
      Answer: type === "A"
        ? [{ type: 1, data: "8.8.8.8" }]
        : [{ type: 28, data: "2606:4700:4700::1111" }]
    });
  };

  const addresses = await resolveHostname("example.com", mockFetch);

  assert.deepEqual(addresses, [
    "8.8.8.8",
    "2606:4700:4700::1111"
  ]);
});

test("removes duplicate DNS addresses", async () => {
  const mockFetch = async (url) => {
    const type = new URL(url).searchParams.get("type");

    return Response.json({
      Status: 0,
      Answer: type === "A"
        ? [
            { type: 1, data: "8.8.8.8" },
            { type: 1, data: "8.8.8.8" }
          ]
        : []
    });
  };

  const addresses = await resolveHostname("example.com", mockFetch);

  assert.deepEqual(addresses, ["8.8.8.8"]);
});

test("rejects failed DNS HTTP responses", async () => {
  const mockFetch = async () =>
    new Response(null, { status: 503 });

  await assert.rejects(
    resolveHostname("example.com", mockFetch),
    /DNS A lookup failed/
  );
});

test("rejects unsuccessful DNS response status", async () => {
  const mockFetch = async () =>
    Response.json({ Status: 2 });

  await assert.rejects(
    resolveHostname("example.com", mockFetch),
    /DNS A lookup returned status 2/
  );
});

test("rejects truncated DNS responses", async () => {
  const mockFetch = async () =>
    Response.json({ Status: 0, TC: true });

  await assert.rejects(
    resolveHostname("example.com", mockFetch),
    /DNS A response was truncated/
  );
});
