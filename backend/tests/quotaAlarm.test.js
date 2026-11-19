import test from "node:test";
import assert from "node:assert/strict";

import {
  scheduleQuotaAlarm
} from "../src/security/quotaAlarm.js";

function transactional(storage) {
  let queue = Promise.resolve();
  return { transaction(callback) {
    const operation = queue.then(() => callback(storage));
    queue = operation.catch(() => {});
    return operation;
  }};
}

test("schedules an alarm when none exists", async () => {
  let alarm = null;

  const storage = {
    async getAlarm() {
      return alarm;
    },
    async setAlarm(time) {
      alarm = time;
    }
  };

  await scheduleQuotaAlarm(transactional(storage), 60000);

  assert.equal(alarm, 60000);
});

test("preserves an earlier existing alarm", async () => {
  let alarm = 60000;

  const storage = {
    async getAlarm() {
      return alarm;
    },
    async setAlarm(time) {
      alarm = time;
    }
  };

  await scheduleQuotaAlarm(transactional(storage), 120000);

  assert.equal(alarm, 60000);
});

test("replaces a later alarm with an earlier expiration", async () => {
  let alarm = 180000;

  const storage = {
    async getAlarm() {
      return alarm;
    },
    async setAlarm(time) {
      alarm = time;
    }
  };

  await scheduleQuotaAlarm(transactional(storage), 60000);

  assert.equal(alarm, 60000);
});

test("propagates alarm storage failures", async () => {
  const storage = {
    async getAlarm() {
      throw new Error("Simulated alarm storage failure");
    },

    async setAlarm() {
      throw new Error("Alarm must not be scheduled");
    }
  };

  await assert.rejects(
    scheduleQuotaAlarm(transactional(storage), 60000),
    /Simulated alarm storage failure/
  );
});

test("propagates alarm write failures", async () => {
  const storage = {
    async getAlarm() {
      return null;
    },

    async setAlarm() {
      throw new Error("Simulated alarm write failure");
    }
  };

  await assert.rejects(
    scheduleQuotaAlarm(transactional(storage), 60000),
    /Simulated alarm write failure/
  );
});

test("preserves earliest alarm under concurrent scheduling", async () => {
  let alarm = null;
  const storage = transactional({
    async getAlarm() { return alarm; },
    async setAlarm(time) {
      await new Promise(resolve => setTimeout(resolve, 10));
      alarm = time;
    }
  });
  await Promise.all([
    scheduleQuotaAlarm(storage, 120000),
    scheduleQuotaAlarm(storage, 60000),
    scheduleQuotaAlarm(storage, 180000)
  ]);
  assert.equal(alarm, 60000);
});

test("rejects standalone scheduling without transactional storage", async () => {
  await assert.rejects(scheduleQuotaAlarm({
    async getAlarm() { throw Error("must not read"); },
    async setAlarm() { throw Error("must not write"); }
  }, 60000), /Transactional quota alarm unavailable/);
});
