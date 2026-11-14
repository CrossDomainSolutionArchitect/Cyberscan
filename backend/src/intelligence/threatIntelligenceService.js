import { checkGoogleWebRisk } from "./providers/googleWebRisk.js";
import { createThreatResult } from "./threatResult.js";

export async function runThreatIntelligence(
  url,
  env = {},
  provider = checkGoogleWebRisk
) {
  const apiKey = env?.GOOGLE_WEB_RISK_API_KEY;

  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return createThreatResult({
      provider: "google-web-risk",
      status: "unavailable",
      error: "Threat intelligence credentials are not configured."
    });
  }

  try {
    return await provider(url, apiKey);
  } catch {
    return createThreatResult({
      provider: "google-web-risk",
      status: "error",
      error: "Threat intelligence service failed."
    });
  }
}
