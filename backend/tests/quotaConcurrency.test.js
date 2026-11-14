import test from "node:test";
import assert from "node:assert/strict";

import {
  QuotaCounter
} from "../src/security/quotaCounter.js";

function createTransactionalStorage() {
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
            await new Promise(resolve => setTimeout(resolve, 5));

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

test("allows only one of ten concurrent requests", async () => {
  const counter = new QuotaCounter(
    createTransactionalStorage()
  );

  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      counter.consume("client-a", 1, 60, 0)
    )
  );

  const allowed = results.filter(r => r.allowed).length;

  assert.equal(allowed, 1);
});

test("never exceeds quota under concurrent load", async () => {
  const counter = new QuotaCounter(
    createTransactionalStorage()
  );

  const results = await Promise.all(
    Array.from({ length: 25 }, () =>
      counter.consume("client-a", 5, 60, 0)
    )
  );

  assert.equal(
    results.filter(r => r.allowed).length,
    5
  );
});

test("maintains independent client quotas", async () => {
  const counter = new QuotaCounter(
    createTransactionalStorage()
  );

  const results = await Promise.all([
    counter.consume("client-a", 1, 60, 0),
    counter.consume("client-b", 1, 60, 0)
  ]);

  assert.equal(results[0].allowed, true);
  assert.equal(results[1].allowed, true);
});

test("fails closed without transactional storage", async () => {
  const counter = new QuotaCounter({
    async get() {
      return 0;
    },
    async put() {}
  });

  const result = await counter.consume(
    "client-a", 1, 60, 0
  );

  assert.equal(result.allowed, false);
  assert.equal(
    result.error,
    "Transactional quota storage unavailable."
  );
});

test("fails closed when a transaction throws", async () => {
  const counter = new QuotaCounter({
    async transaction() {
      throw new Error("Transaction failed");
    }
  });

  const result = await counter.consume(
    "client-a", 1, 60, 0
  );

  assert.equal(result.allowed, false);
});

test("rejects oversized client identifiers", async () => {
  const counter = new QuotaCounter(
    createTransactionalStorage()
  );

  const result = await counter.consume(
    "x".repeat(129), 1, 60, 0
  );

  assert.equal(result.allowed, false);
});
