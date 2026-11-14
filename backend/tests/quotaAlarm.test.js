import test from "node:test";
import assert from "node:assert/strict";

import {
  scheduleQuotaAlarm
} from "../src/security/quotaAlarm.js";

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

  await scheduleQuotaAlarm(storage, 60000);

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

  await scheduleQuotaAlarm(storage, 120000);

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

  await scheduleQuotaAlarm(storage, 60000);

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
    scheduleQuotaAlarm(storage, 60000),
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
    scheduleQuotaAlarm(storage, 60000),
    /Simulated alarm write failure/
  );
});

test(
  "preserves earliest alarm under concurrent scheduling",
  { todo: "Nontransactional race demonstration; production uses transactional scheduling." },
  async () => {
  let alarm = null;
  let reads = 0;

  let releaseReads;
  const bothRead = new Promise(resolve => {
    releaseReads = resolve;
  });

  const storage = {
    async getAlarm() {
      const snapshot = alarm;
      reads++;

      if (reads === 2) {
        releaseReads();
      }

      await bothRead;
      return snapshot;
    },

    async setAlarm(time) {
      if (time === 120000) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      alarm = time;
    }
  };

  await Promise.all([
    scheduleQuotaAlarm(storage, 60000),
    scheduleQuotaAlarm(storage, 120000)
  ]);

  assert.equal(alarm, 60000);
});
