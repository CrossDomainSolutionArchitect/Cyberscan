import test from "node:test";
import assert from "node:assert/strict";

import { QuotaCounter } from "../src/security/quotaCounter.js";

test("fails closed when alarm scheduling fails", async () => {
  let transactionCompleted = false;

  const storage = {
    async transaction(callback) {
      const tx = {
        async get() {
          return undefined;
        },

        async put() {},

        async getAlarm() {
          return null;
        },

        async setAlarm() {
          throw new Error("Alarm scheduling failed");
        }
      };

      const result = await callback(tx);
      transactionCompleted = true;
      return result;
    }
  };

  const counter = new QuotaCounter(storage);

  const result = await counter.consume(
    "alarm-failure-client",
    5,
    60,
    0
  );

  assert.equal(result.allowed, false);
  assert.equal(result.error, "Quota enforcement unavailable.");
  assert.equal(transactionCompleted, false);
});

test("rolls back quota writes when alarm scheduling fails", async () => {
  const records = new Map();

  const storage = {
    async transaction(callback) {
      const pending = new Map();

      const tx = {
        async get(key) {
          return pending.has(key)
            ? pending.get(key)
            : records.get(key);
        },

        async put(key, value) {
          pending.set(key, value);
        },

        async getAlarm() {
          return null;
        },

        async setAlarm() {
          throw new Error("Simulated alarm storage failure");
        }
      };

      const result = await callback(tx);

      for (const [key, value] of pending) {
        records.set(key, value);
      }

      return result;
    }
  };

  const counter = new QuotaCounter(storage);

  const result = await counter.consume(
    "rollback-client",
    5,
    60,
    0
  );

  assert.equal(result.allowed, false);
  assert.equal(result.error, "Quota enforcement unavailable.");

  assert.equal(
    records.has("quota:rollback-client:0"),
    false,
    "Quota record must not be committed after alarm failure"
  );
});
