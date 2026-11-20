import {enforceRateLimit} from "../security/rateLimiter.js";
import {verifyTurnstile} from "../security/turnstileVerifier.js";
import {verifyClerkToken} from "../security/clerkVerifier.js";
import {ensureUser, allowance} from "./entitlements.js";
import {fingerprint,claimRequest,settleRequest,inspectRequest} from "./idempotency.js";
import {runScanPipeline} from "./scanPipeline.js";
import {validateScanRequest} from "../validators/scanRequestValidator.js";
import {successResponse,errorResponse} from "../utils/response.js";
export async function customerRoute(request, env, path, deps = {}) {
  if (request.method !== (path === "/v1/me" ? "GET" : "POST")) return errorResponse("METHOD_NOT_ALLOWED","Unsupported method.",405);
  if(path==="/v1/scans") {
    const denied=await enforceRateLimit(env,"scanIp",request.headers.get("CF-Connecting-IP"));
    if(denied) return denied;
  }
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get("Authorization") || "");
  let identity;
  try { identity = match && await (deps.verify || verifyClerkToken)(match[1]); }
  catch { return errorResponse("AUTH_UNAVAILABLE","Authentication temporarily unavailable.",503); }
  if (!identity) return errorResponse("UNAUTHORIZED","Sign in to CyberScan.",401);
  const db = env.DB;
  if (!db) return errorResponse("DATABASE_UNAVAILABLE","Customer database unavailable.",503);
  const userId = identity.userId;
  const denied=await enforceRateLimit(env,path==="/v1/me"?"accountUser":"scanUser",userId);
  if(denied) return denied;
  await ensureUser(db,userId);
  if (path === "/v1/me") return successResponse({userId,entitlement:await allowance(db,userId)});
  let body;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error();
    let size=0; const chunks=[]; const decoder=new TextDecoder("utf-8",{fatal:true});
    for (;;) { const {done,value}=await reader.read(); if(done) break; size+=value.byteLength; if(size>16384){await reader.cancel();return errorResponse("BODY_TOO_LARGE","Request too large.",413);} chunks.push(decoder.decode(value,{stream:true})); }
    chunks.push(decoder.decode()); body=JSON.parse(chunks.join(""));
  } catch { return errorResponse("INVALID_BODY","Invalid JSON request.",400); }
  const validation=validateScanRequest({url:body?.value});
  if (!body || body.type !== "url" || Object.keys(body).some(k=>!["type","value","requestId","turnstileToken"].includes(k)) || typeof body.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId || '') || typeof body.requestId !== 'string' || typeof body.value !== "string" || !validation.valid) return errorResponse("INVALID_SCAN","Provide a valid URL. Other scan categories are not yet supported.",400);
  const id=crypto.randomUUID();
  let hash;
  try { hash=await fingerprint(env.IDEMPOTENCY_HMAC_KEY,userId,body.value); }
  catch { return errorResponse("IDEMPOTENCY_UNAVAILABLE","Scanner temporarily unavailable.",503); }
  let claim=await inspectRequest(db,userId,body.requestId.toLowerCase(),hash);
  if(claim.state==="new") {
    if((await allowance(db,userId)).remaining===0) return errorResponse("FREE_SCAN_LIMIT_REACHED","Your three complimentary searches have been used.",429);
    if(typeof env.TURNSTILE_SECRET_KEY!=="string" || !env.TURNSTILE_SECRET_KEY.trim()) return errorResponse("VERIFICATION_UNAVAILABLE","Verification temporarily unavailable.",503);
    if(typeof body.turnstileToken!=="string" || !body.turnstileToken.trim() || body.turnstileToken.length>2048) return errorResponse("VERIFICATION_REQUIRED","Complete human verification.",403);
    const verification=await (deps.turnstile || verifyTurnstile)(body.turnstileToken,env.TURNSTILE_SECRET_KEY);
    if(!verification?.verified) return errorResponse("VERIFICATION_FAILED","Human verification failed. Please retry.",403);
    claim=await claimRequest(db,userId,id,body.requestId.toLowerCase(),hash);
  }
  if(claim.state==="conflict") return errorResponse("REQUEST_CONFLICT","Request identifier already used for different input.",409);
  if(claim.state==="pending") return errorResponse("REQUEST_IN_PROGRESS","Scan still processing. Retry shortly.",409);
  if(claim.state==="replay") return successResponse({...claim.outcome,summary:{hostname:validation.hostname},entitlement:await allowance(db,userId)});
  if (claim.state!=="claimed") return errorResponse("FREE_SCAN_LIMIT_REACHED","Your three complimentary searches have been used.",429);
  let result;
  try { result=await (deps.pipeline || runScanPipeline)({url:body.value},env); }
  catch { await settleRequest(db,userId,id,null); return errorResponse("SCAN_UNAVAILABLE","Scan temporarily unavailable.",503); }
  const t=result?.intelligence;
  const completed=result?.status==="completed" && t?.status==="completed" && typeof t.malicious==="boolean" && Array.isArray(t.threats) && t.threats.every(x=>typeof x==="string") && t.malicious===(t.threats.length>0);
  if (!completed) { await settleRequest(db,userId,id,null); return errorResponse("SCAN_NOT_COMPLETED","The scan could not be completed. No free search was consumed.",result?.status==="rejected"?422:503); }
  const outcome={
    verdict:t.malicious?"malicious":"no_known_indicators",
    ...(typeof t.checkedAt==="string" && Number.isFinite(Date.parse(t.checkedAt)) ? {checked_at:t.checkedAt} : {}),
    findings:t.threats.map(type=>({title:type,description:"Google Web Risk reported this threat category."})),
    coverage:{
      providers_succeeded:1,
      ...(typeof t.provider==="string" && t.provider.trim() ? {providers:[{provider:t.provider,status:t.status}]} : {}),
      limitations:["A lookup without known threats does not prove a URL is safe."]
    },
    recommendations:["Avoid sharing sensitive information with untrusted websites."]
  };
  await settleRequest(db,userId,id,outcome);
  return successResponse({...outcome,summary:{hostname:validation.hostname},entitlement:await allowance(db,userId)});
}
