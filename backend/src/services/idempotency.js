import {recoverExpiredReservations} from "./entitlements.js";
export async function fingerprint(secret,userId,value) {
  if(typeof secret!=="string" || secret.length<32) throw new Error("Fingerprint key unavailable");
  const encoder=new TextEncoder();
  const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const bytes=await crypto.subtle.sign("HMAC",key,encoder.encode(JSON.stringify([userId,"url",value])));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
}
export async function inspectRequest(db,userId,requestKey,hash) {
  await recoverExpiredReservations(db,userId);
  const row=await db.prepare("SELECT status,fingerprint,outcome FROM scan_requests WHERE clerk_user_id=? AND request_key=? ORDER BY CASE status WHEN 'completed' THEN 0 WHEN 'reserved' THEN 1 ELSE 2 END LIMIT 1").bind(userId,requestKey).first();
  if(row && row.fingerprint!==hash) return {state:"conflict"};
  if(row?.status==="completed") return {state:"replay",outcome:JSON.parse(row.outcome)};
  if(row?.status==="reserved") return {state:"pending"};
  return {state:"new"};
}
export async function claimRequest(db,userId,id,requestKey,hash) {
  await recoverExpiredReservations(db,userId);
  const inserted=await db.prepare("INSERT INTO scan_requests (id,clerk_user_id,scan_type,status,request_key,fingerprint) SELECT ?,?,'url','reserved',?,? WHERE (SELECT COUNT(*) FROM scan_requests WHERE clerk_user_id=? AND status IN ('reserved','completed'))<3 AND NOT EXISTS (SELECT 1 FROM scan_requests WHERE clerk_user_id=? AND request_key=? AND (fingerprint<>? OR status IN ('reserved','completed')))").bind(id,userId,requestKey,hash,userId,userId,requestKey,hash).run();
  if(inserted.meta.changes===1) return {state:"claimed"};
  const row=await db.prepare("SELECT status,fingerprint,outcome FROM scan_requests WHERE clerk_user_id=? AND request_key=? ORDER BY CASE status WHEN 'completed' THEN 0 WHEN 'reserved' THEN 1 ELSE 2 END LIMIT 1").bind(userId,requestKey).first();
  if(row && row.fingerprint!==hash) return {state:"conflict"};
  if(row?.status==="completed") return {state:"replay",outcome:JSON.parse(row.outcome)};
  if(row?.status==="reserved") return {state:"pending"};
  return {state:"limited"};
}
export async function settleRequest(db,userId,id,outcome) {
  const result=await db.prepare("UPDATE scan_requests SET status=?,outcome=? WHERE id=? AND clerk_user_id=? AND status='reserved' AND created_at>datetime('now','-5 minutes')").bind(outcome?"completed":"failed",outcome?JSON.stringify(outcome):null,id,userId).run();
  if(result.meta.changes!==1) throw new Error("Reservation settlement failed");
}
