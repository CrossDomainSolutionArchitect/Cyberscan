export async function processQuotaAlarm(storage, now = Date.now()) {
  if (
    !Number.isSafeInteger(now) ||
    now < 0 ||
    typeof storage?.transaction !== "function"
  ) {
    throw new Error("Quota alarm lifecycle unavailable.");
  }

  return storage.transaction(async tx => {
    if (
      typeof tx.list !== "function" ||
      typeof tx.delete !== "function" ||
      typeof tx.setAlarm !== "function"
    ) {
      throw new Error("Quota alarm lifecycle storage unavailable.");
    }

    const records = await tx.list({ prefix: "quota:" });

    let deleted = 0;
    let nextExpiration = null;

    for (const [key, value] of records) {
      if (
        !key.startsWith("quota:") ||
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        !Number.isSafeInteger(value.expiresAt) ||
        value.expiresAt < 0
      ) {
        continue;
      }

      if (value.expiresAt <= now) {
        await tx.delete(key);
        deleted++;
        continue;
      }

      if (
        nextExpiration === null ||
        value.expiresAt < nextExpiration
      ) {
        nextExpiration = value.expiresAt;
      }
    }

    if (nextExpiration !== null) {
      await tx.setAlarm(nextExpiration);
    } else {
      if (typeof tx.deleteAlarm !== "function") {
        throw new Error("Quota alarm deletion unavailable.");
      }

      await tx.deleteAlarm();
    }

    return {
      deleted,
      nextExpiration
    };
  });
}
