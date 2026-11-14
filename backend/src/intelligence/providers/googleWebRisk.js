import { createThreatResult } from "../threatResult.js";

const PROVIDER = "google-web-risk";

const ENDPOINT = "https://webrisk.googleapis.com/v1/uris:search";

const THREAT_TYPES = [
  "MALWARE",
  "SOCIAL_ENGINEERING",
  "UNWANTED_SOFTWARE"
];

export async function checkGoogleWebRisk(
  url,
  apiKey,
  fetchImpl = fetch
) {
  if (
    typeof apiKey !== "string" ||
    !apiKey.trim()
  ) {
    return createThreatResult({
      provider: PROVIDER,
      status: "unavailable",
      error: "Provider credentials are not configured."
    });
  }

  try {
    const endpoint = new URL(ENDPOINT);

    endpoint.searchParams.set("uri", url);

    for (const threatType of THREAT_TYPES) {
      endpoint.searchParams.append("threatTypes", threatType);
    }

    endpoint.searchParams.set("key", apiKey);

    const response = await fetchImpl(endpoint.toString(), {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      return createThreatResult({
        provider: PROVIDER,
        status: "error",
        error: "Threat intelligence provider request failed."
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

    const threat = data.threat;

    if (threat === undefined) {
      return createThreatResult({
        provider: PROVIDER,
        status: "completed",
        malicious: false,
        threats: []
      });
    }

    if (
      threat === null ||
      typeof threat !== "object" ||
      Array.isArray(threat) ||
      !Array.isArray(threat.threatTypes) ||
      threat.threatTypes.length === 0 ||
      !threat.threatTypes.every(
        type => THREAT_TYPES.includes(type)
      )
    ) {
      throw new Error("Invalid threat data.");
    }

    return createThreatResult({
      provider: PROVIDER,
      status: "completed",
      malicious: true,
      threats: [...new Set(threat.threatTypes)]
    });

  } catch {
    return createThreatResult({
      provider: PROVIDER,
      status: "error",
      error: "Threat intelligence lookup could not be completed."
    });
  }
}
