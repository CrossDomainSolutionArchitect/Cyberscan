import test from "node:test";
import assert from "node:assert/strict";

import {
  runScanPipeline
} from "../src/services/scanPipeline.js";

import {
  createThreatResult
} from "../src/intelligence/threatResult.js";

const BODY = {
  url: "https://example.org/"
};

const ENV = {
  GOOGLE_WEB_RISK_API_KEY: "mock-test-key"
};

function safeDns() {
  return {
    safe: true,
    hostname: "example.org",
    addresses: ["93.184.215.14"]
  };
}

function threatResult(malicious = false) {
  return createThreatResult({
    provider: "google-web-risk",
    status: "completed",
    malicious,
    threats: malicious ? ["MALWARE"] : []
  });
}

test("completes a scan with no known threats", async () => {
  const result = await runScanPipeline(BODY, ENV, {
    verifyDns: async () => safeDns(),
    checkThreats: async () => threatResult()
  });

  assert.equal(result.status, "completed");
  assert.equal(result.hostname, "example.org");
  assert.equal(result.intelligence.classification, "no_known_threat");
});

test("reports detected malware", async () => {
  const result = await runScanPipeline(BODY, ENV, {
    verifyDns: async () => safeDns(),
    checkThreats: async () => threatResult(true)
  });

  assert.equal(result.status, "completed");
  assert.equal(result.intelligence.classification, "malicious");
  assert.deepEqual(result.intelligence.threats, ["MALWARE"]);
});

test("rejects invalid requests before DNS or intelligence checks", async () => {
  let dnsCalled = false;
  let intelligenceCalled = false;

  const result = await runScanPipeline(
    { url: "http://localhost/" },
    ENV,
    {
      verifyDns: async () => {
        dnsCalled = true;
        return safeDns();
      },
      checkThreats: async () => {
        intelligenceCalled = true;
        return threatResult();
      }
    }
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.stage, "validation");
  assert.equal(dnsCalled, false);
  assert.equal(intelligenceCalled, false);
});

test("rejects unsafe DNS before intelligence lookup", async () => {
  let intelligenceCalled = false;

  const result = await runScanPipeline(BODY, ENV, {
    verifyDns: async () => ({
      safe: false,
      error: "Unsafe DNS address."
    }),
    checkThreats: async () => {
      intelligenceCalled = true;
      return threatResult();
    }
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.stage, "dns");
  assert.equal(intelligenceCalled, false);
});

test("handles DNS service exceptions", async () => {
  let intelligenceCalled = false;

  const result = await runScanPipeline(BODY, ENV, {
    verifyDns: async () => {
      throw new Error("Simulated DNS failure");
    },
    checkThreats: async () => {
      intelligenceCalled = true;
      return threatResult();
    }
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.stage, "dns");
  assert.equal(intelligenceCalled, false);
});

test("handles intelligence provider exceptions", async () => {
  const result = await runScanPipeline(BODY, ENV, {
    verifyDns: async () => safeDns(),
    checkThreats: async () => {
      throw new Error("Simulated provider failure");
    }
  });

  assert.equal(result.status, "error");
  assert.equal(result.stage, "intelligence");
});

test("does not complete scans when intelligence is unavailable", async () => {
  const result = await runScanPipeline(BODY, ENV, {
    verifyDns: async () => safeDns(),
    checkThreats: async () =>
      createThreatResult({
        provider: "google-web-risk",
        status: "unavailable",
        error: "Provider unavailable."
      })
  });

  assert.equal(result.status, "error");
  assert.equal(result.stage, "intelligence");
});
