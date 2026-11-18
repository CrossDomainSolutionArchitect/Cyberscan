import { isIP } from "node:net";
import { validateHostname } from "../validators/hostnameValidator.js";

// Conservative DNS-only IPv6 policy: global unicast allocation, excluding
// special-purpose, documentation and transition ranges. Literal URL policy
// remains separate. isIP validates syntax before canonicalization.
function isPublicIPv6(address) {
  if (address.includes("%") || address.includes(".")) return false;
  const canonical = new URL("https://[" + address + "]/").hostname.slice(1, -1);
  const [left, right = ""] = canonical.split("::");
  const a = left ? left.split(":").map(x => parseInt(x, 16)) : [];
  const b = right ? right.split(":").map(x => parseInt(x, 16)) : [];
  const words = canonical.includes("::")
    ? [...a, ...Array(8 - a.length - b.length).fill(0), ...b]
    : a;
  const [first, second] = words;
  return (first & 0xe000) === 0x2000 &&
    !(first === 0x2001 && second < 0x0200) &&
    !(first === 0x2001 && second === 0x0db8) &&
    first !== 0x2002 &&
    (first & 0xfff0) !== 0x3ff0;
}

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

    if (version === 6 && isPublicIPv6(address)) continue;

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
