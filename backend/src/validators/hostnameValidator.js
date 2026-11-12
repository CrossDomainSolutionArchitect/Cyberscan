import { isIP } from "node:net";

function parseIPv4(hostname) {
  const parts = hostname.split(".");

  if (
    parts.length !== 4 ||
    parts.some(part => !/^\d{1,3}$/.test(part))
  ) {
    return null;
  }

  const numbers = parts.map(Number);

  if (numbers.some(number => number > 255)) {
    return null;
  }

  return numbers;
}

function isUnsafeIPv4(hostname) {
  const ip = parseIPv4(hostname);

  if (!ip) return false;

  const [a, b, c] = ip;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && b >= 18 && b <= 19) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  );
}

export function validateHostname(hostname) {
  if (typeof hostname !== "string" || !hostname.trim()) {
    return {
      valid: false,
      error: "Hostname is required."
    };
  }

  const host = hostname.toLowerCase().replace(/\.$/, "");

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "metadata.google.internal" ||
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    host.endsWith(".test") ||
    host.endsWith(".invalid") ||
    host.endsWith(".example")
  ) {
    return {
      valid: false,
      error: "Internal or reserved hostnames are not permitted."
    };
  }

  const ipVersion = isIP(host.replace(/^\[|\]$/g, ""));

  if (ipVersion === 4 && isUnsafeIPv4(host)) {
    return {
      valid: false,
      error: "Private or reserved IP addresses are not permitted."
    };
  }

  if (ipVersion === 6) {
    return {
      valid: false,
      error: "IPv6 address literals are not supported at this stage."
    };
  }

  if (!host.includes(".") && ipVersion === 0) {
    return {
      valid: false,
      error: "A public hostname is required."
    };
  }

  if (ipVersion === 0) {
    if (host.length > 253) {
      return {
        valid: false,
        error: "Hostname exceeds the maximum DNS length."
      };
    }

    const labels = host.split(".");

    const validLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

    if (labels.some(label => !validLabel.test(label))) {
      return {
        valid: false,
        error: "Hostname contains an invalid DNS label."
      };
    }
  }

  return {
    valid: true,
    hostname: host
  };
}
