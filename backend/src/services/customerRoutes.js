import {verifyClerkToken} from "../security/clerkVerifier.js";
import {ensureUser, allowance, reserveScan, finishScan} from "./entitlements.js";
import {runScanPipeline} from "./scanPipeline.js";
import {validateScanRequest} from "../validators/scanRequestValidator.js";
import {successResponse,errorResponse} from "../utils/response.js";
export async function customerRoute(request, env, path, deps = {}) {
  if (request.method !== (path === "/v1/me" ? "GET" : "POST")) return errorResponse("METHOD_NOT_ALLOWED","Unsupported method.",405);
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get("Authorization") || "");
  let identity;
  try { identity = match && await (deps.verify || verifyClerkToken)(match[1]); }
  catch { return errorResponse("AUTH_UNAVAILABLE","Authentication temporarily unavailable.",503); }
  if (!identity) return errorResponse("UNAUTHORIZED","Sign in to CyberScan.",401);
  const db = env.DB;
  if (!db) return errorResponse("DATABASE_UNAVAILABLE","Customer database unavailable.",503);
  const userId = identity.userId;
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
  if (!body || body.type !== "url" || Object.keys(body).length !== 2 || typeof body.value !== "string" || !validateScanRequest({url:body.value}).valid) return errorResponse("INVALID_SCAN","Provide a valid URL. Other scan categories are not yet supported.",400);
  const id=crypto.randomUUID();
  if (!await reserveScan(db,userId,id)) return errorResponse("FREE_SCAN_LIMIT_REACHED","Your three complimentary searches have been used.",429);
  let result;
  try { result=await (deps.pipeline || runScanPipeline)({url:body.value},env); }
  catch { await finishScan(db,userId,id,false); return errorResponse("SCAN_UNAVAILABLE","Scan temporarily unavailable.",503); }
  const t=result?.intelligence;
  const completed=result?.status==="completed" && t?.status==="completed" && typeof t.malicious==="boolean" && Array.isArray(t.threats) && t.threats.every(x=>typeof x==="string") && t.malicious===(t.threats.length>0);
  await finishScan(db,userId,id,completed);
  if (!completed) return errorResponse("SCAN_NOT_COMPLETED","The scan could not be completed. No free search was consumed.",result?.status==="rejected"?422:503);
  return successResponse({verdict:t.malicious?"malicious":"no_known_indicators",findings:t.threats.map(type=>({title:type,description:"Google Web Risk reported this threat category."})),coverage:{limitations:["A lookup without known threats does not prove a URL is safe."]},recommendations:["Avoid sharing sensitive information with untrusted websites."],entitlement:await allowance(db,userId)});
}
