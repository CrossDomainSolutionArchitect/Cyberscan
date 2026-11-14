import test from "node:test";
import assert from "node:assert/strict";

import {
  processQuotaAlarm
} from "../src/security/quotaAlarmLifecycle.js";

test("cleans expired quotas and schedules next active expiration", async () => {
  const records = new Map([
    ["quota:expired", { count: 1, expiresAt: 60000 }],
    ["quota:next", { count: 1, expiresAt: 180000 }],
    ["quota:later", { count: 1, expiresAt: 240000 }]
  ]);

  let alarm = null;

  const storage = {
    async transaction(callback) {
      const pendingDeletes = [];
      let pendingAlarm = alarm;

      const tx = {
        async list() {
          return new Map(records);
        },
        async delete(key) {
          pendingDeletes.push(key);
        },
        async getAlarm() {
          return pendingAlarm;
        },
        async setAlarm(time) {
          pendingAlarm = time;
        }
      };

      const result = await callback(tx);

      for (const key of pendingDeletes) {
        records.delete(key);
      }

      alarm = pendingAlarm;
      return result;
    }
  };

  const result = await processQuotaAlarm(storage, 120000);

  assert.equal(result.deleted, 1);
  assert.equal(records.has("quota:expired"), false);
  assert.equal(records.size, 2);
  assert.equal(alarm, 180000);
});

test("clears obsolete alarm when no active quotas remain", async () => {
  const records = new Map([
    ["quota:expired", { count: 1, expiresAt: 60000 }]
  ]);

  let alarm = 60000;

  const storage = {
    async transaction(callback) {
      const pendingDeletes = [];
      let pendingAlarm = alarm;

      const tx = {
        async list() {
          return new Map(records);
        },

        async delete(key) {
          pendingDeletes.push(key);
        },

        async getAlarm() {
          return pendingAlarm;
        },

        async setAlarm(time) {
          pendingAlarm = time;
        },

        async deleteAlarm() {
          pendingAlarm = null;
        }
      };

      const result = await callback(tx);

      for (const key of pendingDeletes) {
        records.delete(key);
      }

      alarm = pendingAlarm;
      return result;
    }
  };

  const result = await processQuotaAlarm(storage, 120000);

  assert.equal(result.deleted, 1);
  assert.equal(result.nextExpiration, null);
  assert.equal(records.size, 0);
  assert.equal(alarm, null);
});

test("preserves malformed records while processing valid quotas", async () => {
  const records = new Map([
    ["quota:invalid-string", {
      count: 1,
      expiresAt: "60000"
    }],
    ["quota:missing-expiration", {
      count: 1
    }],
    ["quota:invalid-null", null],
    ["quota:expired", {
      count: 1,
      expiresAt: 60000
    }],
    ["quota:active", {
      count: 1,
      expiresAt: 180000
    }]
  ]);

  let alarm = null;

  const storage = {
    async transaction(callback) {
      const pendingDeletes = [];
      let pendingAlarm = alarm;

      const tx = {
        async list() {
          return new Map(records);
        },

        async delete(key) {
          pendingDeletes.push(key);
        },

        async getAlarm() {
          return pendingAlarm;
        },

        async setAlarm(time) {
          pendingAlarm = time;
        },

        async deleteAlarm() {
          pendingAlarm = null;
        }
      };

      const result = await callback(tx);

      for (const key of pendingDeletes) {
        records.delete(key);
      }

      alarm = pendingAlarm;
      return result;
    }
  };

  const result = await processQuotaAlarm(storage, 120000);

  assert.equal(result.deleted, 1);
  assert.equal(result.nextExpiration, 180000);

  assert.equal(records.has("quota:expired"), false);
  assert.equal(records.has("quota:invalid-string"), true);
  assert.equal(records.has("quota:missing-expiration"), true);
  assert.equal(records.has("quota:invalid-null"), true);
  assert.equal(records.has("quota:active"), true);

  assert.equal(records.size, 4);
  assert.equal(alarm, 180000);
});

test("rolls back cleanup when alarm rescheduling fails", async () => {
  const records = new Map([
    ["quota:expired", { count: 1, expiresAt: 60000 }],
    ["quota:active", { count: 1, expiresAt: 180000 }]
  ]);

  let transactionCommitted = false;

  const storage = {
    async transaction(callback) {
      const pendingDeletes = [];

      const tx = {
        async list() {
          return new Map(records);
        },

        async delete(key) {
          pendingDeletes.push(key);
        },

        async setAlarm() {
          throw new Error("Simulated alarm scheduling failure");
        }
      };

      const result = await callback(tx);

      for (const key of pendingDeletes) {
        records.delete(key);
      }

      transactionCommitted = true;
      return result;
    }
  };

  await assert.rejects(
    processQuotaAlarm(storage, 120000),
    /Simulated alarm scheduling failure/
  );

  assert.equal(transactionCommitted, false);

  assert.equal(
    records.has("quota:expired"),
    true,
    "Expired record must remain after transaction failure"
  );

  assert.equal(records.has("quota:active"), true);
  assert.equal(records.size, 2);
});

test("preserves renewed quotas during alarm cleanup", async () => {
  const key = "quota:renewed";
  const records = new Map([
    [key, { count: 1, expiresAt: 60000 }]
  ]);

  let alarm = 60000;

  const storage = {
    async transaction(callback) {
      records.set(key, { count: 2, expiresAt: 180000 });
      let nextAlarm = alarm;

      const tx = {
        async list() { return new Map(records); },
        async delete(k) { records.delete(k); },
        async setAlarm(t) { nextAlarm = t; },
        async deleteAlarm() { nextAlarm = null; }
      };

      const result = await callback(tx);
      alarm = nextAlarm;
      return result;
    }
  };

  const result = await processQuotaAlarm(storage, 120000);

  assert.equal(result.deleted, 0);
  assert.equal(result.nextExpiration, 180000);
  assert.deepEqual(records.get(key), {
    count: 2,
    expiresAt: 180000
  });
  assert.equal(alarm, 180000);
});
