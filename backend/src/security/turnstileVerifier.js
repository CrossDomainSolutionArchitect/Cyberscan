const ENDPOINT =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const ALLOWED_HOSTNAMES = new Set([
  "cyberscan.co.za",
  "www.cyberscan.co.za"
]);

const EXPECTED_ACTION = "scan_url";

export async function verifyTurnstile(
  token,
  secret,
  fetchImpl = fetch
) {
  if (typeof secret !== "string" || !secret.trim()) {
    return {
      verified: false,
      error: "Turnstile is not configured."
    };
  }

  if (
    typeof token !== "string" ||
    !token.trim() ||
    token.length > 2048
  ) {
    return {
      verified: false,
      error: "Invalid Turnstile token."
    };
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token
    });

    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body,
      redirect: "error",
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return {
        verified: false,
        error: "Turnstile verification failed."
      };
    }

    const data = await response.json();

    if (
      data === null ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      data.success !== true ||
      typeof data.hostname !== "string" ||
      !ALLOWED_HOSTNAMES.has(data.hostname) ||
      data.action !== EXPECTED_ACTION
    ) {
      return {
        verified: false,
        error: "Turnstile verification failed."
      };
    }

    return {
      verified: true
    };

  } catch {
    return {
      verified: false,
      error: "Turnstile verification unavailable."
    };
  }
}
