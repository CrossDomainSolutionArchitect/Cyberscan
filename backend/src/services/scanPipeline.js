import { validateScanRequest } from "../validators/scanRequestValidator.js";
import { checkDnsSecurity } from "../security/dnsSecurityService.js";
import { runThreatIntelligence } from "../intelligence/threatIntelligenceService.js";

export async function runScanPipeline(
  body,
  env = {},
  dependencies = {}
) {
  const validateRequest =
    dependencies.validateRequest ?? validateScanRequest;

  const verifyDns =
    dependencies.verifyDns ?? checkDnsSecurity;

  const checkThreats =
    dependencies.checkThreats ?? runThreatIntelligence;

  const validation = validateRequest(body);

  if (!validation.valid) {
    return {
      status: "rejected",
      stage: "validation",
      error: validation.error
    };
  }

  let dns;

  try {
    dns = await verifyDns(validation.hostname);
  } catch {
    return {
      status: "rejected",
      stage: "dns",
      error: "DNS security verification failed."
    };
  }

  if (!dns?.safe) {
    return {
      status: "rejected",
      stage: "dns",
      error: dns?.error ?? "DNS security verification failed."
    };
  }

  let intelligence;

  try {
    intelligence = await checkThreats(validation.url, env);
  } catch {
    return {
      status: "error",
      stage: "intelligence",
      error: "Threat intelligence service failed."
    };
  }

  if (
    !intelligence ||
    intelligence.status !== "completed"
  ) {
    return {
      status: "error",
      stage: "intelligence",
      error: "Threat intelligence lookup was not completed."
    };
  }

  return {
    status: "completed",
    url: validation.url,
    hostname: validation.hostname,
    intelligence
  };
}
