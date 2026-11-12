export function createThreatResult({
  provider,
  status,
  malicious = false,
  threats = [],
  checkedAt = new Date().toISOString(),
  error = null
}) {
  const validStatuses = [
    "completed",
    "unavailable",
    "error"
  ];

  if (
    typeof provider !== "string" ||
    !provider.trim()
  ) {
    throw new Error("Threat provider is required.");
  }

  if (!validStatuses.includes(status)) {
    throw new Error("Invalid threat result status.");
  }

  if (
    typeof malicious !== "boolean" ||
    !Array.isArray(threats)
  ) {
    throw new Error("Invalid threat result data.");
  }

  if (status !== "completed" && (malicious || threats.length > 0)) {
    throw new Error("Incomplete lookups cannot contain confirmed threats.");
  }

  if (status === "completed" && malicious !== (threats.length > 0)) {
    throw new Error("Threat detection flag must match threat findings.");
  }

  const classification =
    status !== "completed"
      ? "unknown"
      : malicious
        ? "malicious"
        : "no_known_threat";

  return {
    provider,
    status,
    classification,
    malicious,
    threats,
    checkedAt,
    error
  };
}
