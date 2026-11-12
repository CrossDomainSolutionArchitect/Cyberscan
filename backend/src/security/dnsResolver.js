const DNS_ENDPOINT = "https://cloudflare-dns.com/dns-query";

export async function resolveHostname(hostname, fetchImpl = fetch) {
  const records = [];

  for (const [type, code] of [["A", 1], ["AAAA", 28]]) {
    const url = new URL(DNS_ENDPOINT);

    url.searchParams.set("name", hostname);
    url.searchParams.set("type", type);

    const response = await fetchImpl(url.toString(), {
      method: "GET",
      headers: {
        accept: "application/dns-json"
      },
      redirect: "error",
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`DNS ${type} lookup failed.`);
    }

    const result = await response.json();

    if (result.Status !== 0) {
      throw new Error(`DNS ${type} lookup returned status ${result.Status}.`);
    }

    if (result.TC === true) {
      throw new Error(`DNS ${type} response was truncated.`);
    }

    for (const answer of result.Answer ?? []) {
      if (
        answer.type === code &&
        typeof answer.data === "string"
      ) {
        records.push(answer.data);
      }
    }
  }

  return [...new Set(records)];
}
