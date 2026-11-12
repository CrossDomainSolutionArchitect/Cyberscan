import { isIP } from "node:net";
import { validateHostname } from "../validators/hostnameValidator.js";

export function validateDnsAddresses(addresses) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return {
      valid: false,
      error: "DNS resolution returned no IP addresses."
    };
  }

  for (const address of addresses) {
    if (typeof address !== "string") {
      return {
        valid: false,
        error: "DNS response contains an invalid address."
      };
    }

    const version = isIP(address);

    if (version !== 4) {
      return {
        valid: false,
        error: "DNS response contains an unsupported IP address."
      };
    }

    const result = validateHostname(address);

    if (!result.valid) {
      return {
        valid: false,
        error: "DNS response contains a prohibited IP address."
      };
    }
  }

  return {
    valid: true,
    addresses: [...new Set(addresses)]
  };
}
