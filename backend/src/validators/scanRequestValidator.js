import { validateUrl } from "./urlValidator.js";

export function validateScanRequest(body) {
  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return {
      valid: false,
      error: "Request body must be a JSON object."
    };
  }

  const keys = Object.keys(body);

  if (
    keys.length !== 1 ||
    keys[0] !== "url"
  ) {
    return {
      valid: false,
      error: "Request body must contain only the url field."
    };
  }

  const result = validateUrl(body.url);

  if (!result.valid) {
    return {
      valid: false,
      error: result.error
    };
  }

  return {
    valid: true,
    url: result.normalizedUrl,
    hostname: result.hostname,
    protocol: result.protocol
  };
}
