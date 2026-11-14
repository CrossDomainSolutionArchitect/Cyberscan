export async function scheduleQuotaAlarm(storage, expiresAt) {
  if (
    !Number.isSafeInteger(expiresAt) ||
    expiresAt < 0 ||
    typeof storage?.getAlarm !== "function" ||
    typeof storage?.setAlarm !== "function"
  ) {
    throw new Error("Quota alarm scheduling unavailable.");
  }

  const existingAlarm = await storage.getAlarm();

  if (
    existingAlarm !== null &&
    existingAlarm !== undefined &&
    (
      !Number.isSafeInteger(existingAlarm) ||
      existingAlarm < 0
    )
  ) {
    throw new Error("Invalid existing quota alarm.");
  }

  if (
    existingAlarm === null ||
    existingAlarm === undefined ||
    expiresAt < existingAlarm
  ) {
    await storage.setAlarm(expiresAt);
  }
}

export async function scheduleQuotaAlarmTransactional(
  storage,
  expiresAt
) {
  if (
    !Number.isSafeInteger(expiresAt) ||
    expiresAt < 0 ||
    typeof storage?.transaction !== "function"
  ) {
    throw new Error("Transactional quota alarm unavailable.");
  }

  return storage.transaction(async tx => {
    await scheduleQuotaAlarm(tx, expiresAt);
  });
}
