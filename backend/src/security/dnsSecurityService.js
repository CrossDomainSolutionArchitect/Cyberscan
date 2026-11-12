import { validateHostname } from "../validators/hostnameValidator.js";
import { resolveHostname } from "./dnsResolver.js";
import { validateDnsAddresses } from "./dnsAddressValidator.js";

export async function checkDnsSecurity(hostname, fetchImpl = fetch) {
  const hostnameResult = validateHostname(hostname);

  if (!hostnameResult.valid) {
    return {
      safe: false,
      error: hostnameResult.error
    };
  }

  try {
    const addresses = await resolveHostname(
      hostnameResult.hostname,
      fetchImpl
    );

    const validation = validateDnsAddresses(addresses);

    if (!validation.valid) {
      return {
        safe: false,
        error: validation.error
      };
    }

    return {
      safe: true,
      hostname: hostnameResult.hostname,
      addresses: validation.addresses
    };
  } catch {
    return {
      safe: false,
      error: "DNS security verification failed."
    };
  }
}
