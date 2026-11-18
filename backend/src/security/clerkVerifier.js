const issuer = "https://clerk.cyberscan.co.za";
const origins = new Set(["https://cyberscan.co.za", "https://www.cyberscan.co.za"]);
const decode = s => {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) throw new Error("Invalid encoding");
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
};
const json = s => JSON.parse(new TextDecoder("utf-8", {fatal:true}).decode(decode(s)));
export async function verifyClerkToken(token, fetcher = (...args) => globalThis.fetch(...args), now = Date.now()/1000) {
  let parts, header, claims, signature;
  try {
    if (typeof token !== "string" || token.length > 16384) return null;
    parts = token.split(".");
    if (parts.length !== 3) return null;
    header = json(parts[0]); claims = json(parts[1]); signature = decode(parts[2]);
    if (header.alg !== "RS256" || typeof header.kid !== "string" || header.crit !== undefined ||
      claims.iss !== issuer || !origins.has(claims.azp) ||
      !Number.isSafeInteger(claims.exp) || claims.exp <= now ||
      !Number.isSafeInteger(claims.nbf) || claims.nbf > now + 5 ||
      !Number.isSafeInteger(claims.iat) || claims.iat > now + 5 ||
      typeof claims.sid !== "string" || !claims.sid.startsWith("sess_") ||
      typeof claims.sub !== "string" || !/^user_[A-Za-z0-9]+$/.test(claims.sub) ||
      (claims.sts !== undefined && claims.sts !== "active")) return null;
  } catch { return null; }
  let stage = "jwks_fetch";
  let upstreamStatus;
  try {
  const response = await fetcher(issuer + "/.well-known/jwks.json", {redirect:"error", signal:AbortSignal.timeout(5000)});
  upstreamStatus = response.status;
  stage = "jwks_status";
  if (!response.ok) throw new Error("JWKS unavailable");
  stage = "jwks_parse";
  const body = await response.json();
  if (!Array.isArray(body.keys)) throw new Error("Invalid JWKS");
  const key = body.keys.find(k => k.kid === header.kid && k.kty === "RSA" && (!k.alg || k.alg === "RS256") && (!k.use || k.use === "sig"));
  if (!key) return null;
  stage = "rsa_import";
  const publicKey = await crypto.subtle.importKey("jwk", key, {name:"RSASSA-PKCS1-v1_5", hash:"SHA-256"}, false, ["verify"]);
  stage = "rsa_verify";
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, new TextEncoder().encode(parts[0]+"."+parts[1]));
  return valid ? {userId:claims.sub, sessionId:claims.sid} : null;
  } catch (error) {
    console.warn("AUTH-001 verification unavailable", {stage, upstreamStatus: Number.isInteger(upstreamStatus) ? upstreamStatus : null, errorType: ["TypeError","Error","TimeoutError","AbortError","DataError","OperationError","NotSupportedError","SyntaxError","InvalidAccessError"].includes(error?.name) ? error.name : "OtherError"});
    throw error;
  }
}
