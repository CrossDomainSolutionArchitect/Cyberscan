export async function cleanupExpiredQuotas(storage, now = Date.now()) {
  if (
    !Number.isSafeInteger(now) ||
    now < 0 ||
    typeof storage?.transaction !== "function"
  ) {
    throw new Error("Quota cleanup unavailable.");
  }

  return storage.transaction(async tx => {
    const records = await tx.list({ prefix: "quota:" });
    let deleted = 0;

    for (const [key, value] of records) {
      if (
        !key.startsWith("quota:") ||
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        !Number.isSafeInteger(value.expiresAt)
      ) {
        continue;
      }

      if (value.expiresAt <= now) {
        await tx.delete(key);
        deleted++;
      }
    }

    return { deleted };
  });
}
