import {errorResponse} from "../utils/response.js";

export async function enforceRateLimit(env, scope, identity) {
  const limits = {scanIp:60,scanUser:20,accountUser:30};
  try {
    if (!Object.hasOwn(limits,scope) || typeof identity !== "string" || !identity.trim() || identity.length>256 || !env.QUOTA_COUNTER) throw Error();
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(scope+":"+identity));
    const key=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
    const stub=env.QUOTA_COUNTER.get(env.QUOTA_COUNTER.idFromName(key));
    const response=await stub.fetch("https://quota.internal/consume",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key,limit:limits[scope],windowSeconds:60})});
    const data=await response.json();
    if(response.status===200 && data?.allowed===true) return null;
    if(response.status===429 && data?.allowed===false && Number.isInteger(data.retryAfterSeconds) && data.retryAfterSeconds>=1 && data.retryAfterSeconds<=60) {
      const denied=errorResponse("RATE_LIMIT_EXCEEDED","Too many requests. Try again shortly.",429);
      denied.headers.set("Retry-After",String(data.retryAfterSeconds));
      return denied;
    }
  } catch {}
  return errorResponse("RATE_LIMIT_UNAVAILABLE","Request protection temporarily unavailable.",503);
}
