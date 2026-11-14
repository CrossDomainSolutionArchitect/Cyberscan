import test from "node:test";
import assert from "node:assert/strict";

import {
  scheduleQuotaAlarmTransactional
} from "../src/security/quotaAlarm.js";

test("schedules the earliest alarm inside a transaction", async () => {
  let alarm = null;

  let transactionQueue = Promise.resolve();

  const storage = {
    transaction(callback) {
      const operation = transactionQueue.then(async () => {
        const tx = {
          async getAlarm() {
            return alarm;
          },

          async setAlarm(time) {
            alarm = time;
          }
        };

        return callback(tx);
      });

      transactionQueue = operation.catch(() => {});
      return operation;
    }
  };

  await Promise.all([
    scheduleQuotaAlarmTransactional(storage, 60000),
    scheduleQuotaAlarmTransactional(storage, 120000)
  ]);

  assert.equal(alarm, 60000);
});
