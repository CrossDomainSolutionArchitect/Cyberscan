import { validateHostname } from "./hostnameValidator.js";

export function validateUrl(input) {
  if (typeof input !== "string") {
    return {
      valid: false,
      error: "URL must be a string."
    };
  }

  const value = input.trim();

  if (!value) {
    return {
      valid: false,
      error: "URL cannot be empty."
    };
  }

  if (value.length > 2048) {
    return {
      valid: false,
      error: "URL exceeds the maximum length of 2048 characters."
    };
  }

  if (value.includes("\\")) {
    return {
      valid: false,
      error: "URLs containing backslashes are not supported."
    };
  }

  let url;

  try {
    url = new URL(value);
  } catch {
    return {
      valid: false,
      error: "Invalid URL format."
    };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return {
      valid: false,
      error: "Only HTTP and HTTPS URLs are supported."
    };
  }

  if (url.username || url.password) {
    return {
      valid: false,
      error: "URLs containing embedded credentials are not supported."
    };
  }

  const hostnameResult = validateHostname(url.hostname);

  if (!hostnameResult.valid) {
    return {
      valid: false,
      error: hostnameResult.error
    };
  }

  return {
    valid: true,
    normalizedUrl: url.href,
    hostname: hostnameResult.hostname,
    protocol: url.protocol
  };
}
