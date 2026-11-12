import { createThreatResult } from "../threatResult.js";

const API_ENDPOINT =
  "https://safebrowsing.googleapis.com/v4/threatMatches:find";

export async function checkGoogleSafeBrowsing(
  url,
  apiKey,
  fetchImpl = fetch
) {
  const provider = "google-safe-browsing";

  if (!apiKey || typeof apiKey !== "string") {
    return createThreatResult({
      provider,
      status: "unavailable",
      error: "Google Safe Browsing API key is not configured."
    });
  }

  try {
    const endpoint = new URL(API_ENDPOINT);
    endpoint.searchParams.set("key", apiKey);

    const response = await fetchImpl(endpoint.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client: {
          clientId: "cyberscan",
          clientVersion: "1.0.0"
        },
        threatInfo: {
          threatTypes: [
            "MALWARE",
            "SOCIAL_ENGINEERING",
            "UNWANTED_SOFTWARE",
            "POTENTIALLY_HARMFUL_APPLICATION"
          ],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }]
        }
      }),
      redirect: "error",
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return createThreatResult({
        provider,
        status: "error",
        error: `Provider returned HTTP ${response.status}.`
      });
    }

    const data = await response.json();

    if (
      data === null ||
      typeof data !== "object" ||
      Array.isArray(data)
    ) {
      throw new Error("Invalid provider response.");
    }

    if (
      data.matches !== undefined &&
      !Array.isArray(data.matches)
    ) {
      throw new Error("Invalid provider matches.");
    }

    const matches = data.matches ?? [];

    const allowedThreatTypes = new Set([
      "MALWARE",
      "SOCIAL_ENGINEERING",
      "UNWANTED_SOFTWARE",
      "POTENTIALLY_HARMFUL_APPLICATION"
    ]);

    if (!matches.every(match =>
      match !== null &&
      typeof match === "object" &&
      !Array.isArray(match) &&
      allowedThreatTypes.has(match.threatType)
    )) {
      throw new Error("Invalid provider threat match.");
    }

    return createThreatResult({
      provider,
      status: "completed",
      malicious: matches.length > 0,
      threats: matches.map(match => match.threatType)
    });
  } catch {
    return createThreatResult({
      provider,
      status: "error",
      error: "Threat-intelligence lookup failed."
    });
  }
}
