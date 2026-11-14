import { scheduleQuotaAlarm } from "./quotaAlarm.js";

export class QuotaCounter {
  constructor(storage) {
    this.storage = storage;
  }

  async consume(key, limit, windowSeconds, now = Date.now()) {
    const windowMs = windowSeconds * 1000;

    if (
      typeof key !== "string" ||
      !key.trim() ||
      key.length > 128 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      !Number.isSafeInteger(windowSeconds) ||
      windowSeconds < 1 ||
      !Number.isSafeInteger(windowMs) ||
      !Number.isSafeInteger(now) ||
      now < 0
    ) {
      return {
        allowed: false,
        error: "Invalid quota configuration."
      };
    }

    if (typeof this.storage?.transaction !== "function") {
      return {
        allowed: false,
        error: "Transactional quota storage unavailable."
      };
    }

    const windowId = Math.floor(now / windowMs);
    const expiresAt = (windowId + 1) * windowMs;

    if (!Number.isSafeInteger(expiresAt)) {
      return {
        allowed: false,
        error: "Invalid quota configuration."
      };
    }
    const storageKey = `quota:${key}:${windowId}`;

    const retryAfterSeconds = Math.ceil(
      ((windowId + 1) * windowMs - now) / 1000
    );

    try {
      return await this.storage.transaction(async tx => {
        const stored = await tx.get(storageKey);


        const current =
          stored === undefined
            ? 0
            : typeof stored === "number"
              ? stored
              : stored?.count;

        const validExpiration =
          stored === undefined ||
          typeof stored === "number" ||
          (
            stored !== null &&
            typeof stored === "object" &&
            !Array.isArray(stored) &&
            stored.expiresAt === expiresAt
          );

        if (
          !validExpiration ||
          !Number.isSafeInteger(current) ||
          current < 0
        ) {
          return {
            allowed: false,
            error: "Invalid quota state."
          };
        }

        if (current >= limit) {
          return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds
          };
        }

        const next = current + 1;

        await tx.put(storageKey, {
          count: next,
          expiresAt
        });

        await scheduleQuotaAlarm(tx, expiresAt);

        return {
          allowed: true,
          remaining: limit - next
        };
      });
    } catch {
      return {
        allowed: false,
        error: "Quota enforcement unavailable."
      };
    }
  }
}
