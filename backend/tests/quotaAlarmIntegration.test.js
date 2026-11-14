import test from "node:test";
import assert from "node:assert/strict";

import { QuotaCounter } from "../src/security/quotaCounter.js";

test("quota consumption schedules an expiration alarm transactionally", async () => {
  const records = new Map();
  let alarm = null;

  const storage = {
    async transaction(callback) {
      const tx = {
        async get(key) {
          return records.get(key);
        },

        async put(key, value) {
          records.set(key, value);
        },

        async getAlarm() {
          return alarm;
        },

        async setAlarm(time) {
          alarm = time;
        }
      };

      return callback(tx);
    }
  };

  const counter = new QuotaCounter(storage);

  const result = await counter.consume(
    "integration-test",
    5,
    60,
    0
  );

  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 4);

  assert.deepEqual(
    records.get("quota:integration-test:0"),
    {
      count: 1,
      expiresAt: 60000
    }
  );

  assert.equal(alarm, 60000);
});
