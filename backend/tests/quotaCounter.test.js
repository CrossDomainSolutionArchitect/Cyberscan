import test from "node:test";
import assert from "node:assert/strict";
import { QuotaCounter } from "../src/security/quotaCounter.js";

function createStorage() {
  const data = new Map();
  let queue = Promise.resolve();
  let alarm = null;

  return {
    transaction(callback) {
      const operation = queue.then(async () => {
        const changes = new Map();
        let pendingAlarm = alarm;

        const tx = {
          async get(key) {
            return changes.has(key)
              ? changes.get(key)
              : data.get(key);
          },

          async put(key, value) {
            changes.set(key, value);
          },

          async getAlarm() {
            return pendingAlarm;
          },

          async setAlarm(time) {
            pendingAlarm = time;
          }
        };

        const result = await callback(tx);

        for (const [key, value] of changes) {
          data.set(key, value);
        }

        alarm = pendingAlarm;
        return result;
      });

      queue = operation.catch(() => {});
      return operation;
    }
  };
}

test("allows requests within quota", async () => {
  const counter = new QuotaCounter(createStorage());

  const result = await counter.consume("client-a", 3, 60, 0);

  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 2);
});

test("decrements remaining quota", async () => {
  const counter = new QuotaCounter(createStorage());

  await counter.consume("client-a", 3, 60, 0);
  const result = await counter.consume("client-a", 3, 60, 0);

  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 1);
});

test("rejects requests after quota exhaustion", async () => {
  const counter = new QuotaCounter(createStorage());

  await counter.consume("client-a", 2, 60, 0);
  await counter.consume("client-a", 2, 60, 0);

  const result = await counter.consume("client-a", 2, 60, 0);

  assert.equal(result.allowed, false);
  assert.equal(result.remaining, 0);
  assert.equal(result.retryAfterSeconds, 60);
});

test("resets quota in the next time window", async () => {
  const counter = new QuotaCounter(createStorage());

  await counter.consume("client-a", 1, 60, 0);

  const result = await counter.consume(
    "client-a", 1, 60, 60000
  );

  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 0);
});

test("maintains independent client quotas", async () => {
  const counter = new QuotaCounter(createStorage());

  await counter.consume("client-a", 1, 60, 0);

  const result = await counter.consume(
    "client-b", 1, 60, 0
  );

  assert.equal(result.allowed, true);
});

test("rejects invalid quota limits", async () => {
  const counter = new QuotaCounter(createStorage());

  const result = await counter.consume("client-a", 0, 60, 0);

  assert.equal(result.allowed, false);
});

test("rejects invalid time windows", async () => {
  const counter = new QuotaCounter(createStorage());

  const result = await counter.consume("client-a", 2, 0, 0);

  assert.equal(result.allowed, false);
});

test("rejects empty client keys", async () => {
  const counter = new QuotaCounter(createStorage());

  const result = await counter.consume("", 2, 60, 0);

  assert.equal(result.allowed, false);
});

test("fails closed on storage errors", async () => {
  const storage = {
    async transaction(callback) {
      return callback({
        async get() {
          throw new Error("Storage unavailable");
        },
        async put() {}
      });
    }
  };

  const counter = new QuotaCounter(storage);

  const result = await counter.consume(
    "client-a", 2, 60, 0
  );

  assert.equal(result.allowed, false);
  assert.equal(
    result.error,
    "Quota enforcement unavailable."
  );
});

test("rejects invalid stored quota state", async () => {
  const storage = {
    async transaction(callback) {
      return callback({
        async get() {
          return -1;
        },
        async put() {
          throw new Error(
            "Invalid state must not be written"
          );
        }
      });
    }
  };

  const counter = new QuotaCounter(storage);

  const result = await counter.consume(
    "client-a", 2, 60, 0
  );

  assert.equal(result.allowed, false);
  assert.equal(result.error, "Invalid quota state.");
});

test("stores quota expiration metadata", async () => {
  let storedValue;
  let scheduledAlarm = null;

  const storage = {
    async transaction(callback) {
      return callback({
        async get() {
          return undefined;
        },
        async put(key, value) {
          storedValue = value;
        },
        async getAlarm() {
          return scheduledAlarm;
        },
        async setAlarm(time) {
          scheduledAlarm = time;
        }
      });
    }
  };

  const counter = new QuotaCounter(storage);

  const result = await counter.consume(
    "client-a", 2, 60, 0
  );

  assert.equal(result.allowed, true);

  assert.deepEqual(storedValue, {
    count: 1,
    expiresAt: 60000
  });

  assert.equal(scheduledAlarm, 60000);
});

test("rejects unsafe quota expiration timestamps", async () => {
  let transactionCalled = false;

  const storage = {
    async transaction() {
      transactionCalled = true;
      throw new Error("Transaction should not execute");
    }
  };

  const counter = new QuotaCounter(storage);

  const result = await counter.consume(
    "client-a",
    1,
    60,
    Number.MAX_SAFE_INTEGER - 1
  );

  assert.equal(result.allowed, false);
  assert.equal(
    result.error,
    "Invalid quota configuration."
  );
  assert.equal(transactionCalled, false);
});
