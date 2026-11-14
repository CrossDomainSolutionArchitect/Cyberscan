import test from "node:test";
import assert from "node:assert/strict";

import {
  cleanupExpiredQuotas
} from "../src/security/quotaCleanup.js";

test("deletes expired quotas and preserves active quotas", async () => {
  const records = new Map([
    ["quota:client-a:1", {
      count: 1,
      expiresAt: 60000
    }],
    ["quota:client-b:2", {
      count: 2,
      expiresAt: 120000
    }],
    ["quota:client-c:3", {
      count: 1,
      expiresAt: 180000
    }]
  ]);

  const deleted = [];

  const storage = {
    async transaction(callback) {
      return callback({
        async list() {
          return new Map(records);
        },

        async delete(key) {
          deleted.push(key);
          records.delete(key);
        }
      });
    }
  };

  await cleanupExpiredQuotas(storage, 120000);

  assert.deepEqual(
    deleted,
    ["quota:client-a:1", "quota:client-b:2"]
  );

  assert.equal(records.has("quota:client-c:3"), true);
  assert.equal(records.size, 1);
});

test("propagates cleanup storage transaction failures", async () => {
  const storage = {
    async transaction() {
      throw new Error("Simulated storage failure");
    }
  };

  await assert.rejects(
    cleanupExpiredQuotas(storage, 120000),
    /Simulated storage failure/
  );
});

test("preserves malformed quota records during cleanup", async () => {
  const records = new Map([
    ["quota:invalid-string", {
      count: 1,
      expiresAt: "60000"
    }],
    ["quota:missing-expiration", {
      count: 2
    }],
    ["quota:invalid-null", null],
    ["quota:active", {
      count: 1,
      expiresAt: 180000
    }]
  ]);

  const storage = {
    async transaction(callback) {
      return callback({
        async list() {
          return new Map(records);
        },

        async delete(key) {
          records.delete(key);
        }
      });
    }
  };

  const result = await cleanupExpiredQuotas(
    storage,
    120000
  );

  assert.equal(result.deleted, 0);
  assert.equal(records.size, 4);
});

test("preserves a quota renewed before cleanup transaction", async () => {
  const key = "quota:client-a:1";

  const records = new Map([
    [key, {
      count: 1,
      expiresAt: 60000
    }]
  ]);

  const storage = {
    async transaction(callback) {
      // Simulate an update committed before cleanup begins.
      records.set(key, {
        count: 2,
        expiresAt: 180000
      });

      return callback({
        async list() {
          return new Map(records);
        },

        async delete(recordKey) {
          records.delete(recordKey);
        }
      });
    }
  };

  const result = await cleanupExpiredQuotas(
    storage,
    120000
  );

  assert.equal(result.deleted, 0);

  assert.deepEqual(records.get(key), {
    count: 2,
    expiresAt: 180000
  });
});
