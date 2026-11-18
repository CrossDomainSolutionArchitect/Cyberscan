export async function ensureUser(db, userId) {
  await db.prepare("INSERT INTO users (clerk_user_id) VALUES (?) ON CONFLICT(clerk_user_id) DO NOTHING").bind(userId).run();
}
export async function allowance(db, userId) {
  const row = await db.prepare("SELECT COUNT(*) AS used FROM scan_requests WHERE clerk_user_id = ? AND status IN ('reserved','completed')").bind(userId).first();
  return {limit:3, remaining:Math.max(0,3-row.used)};
}
export async function reserveScan(db, userId, id) {
  // Single atomic SQLite statement; no separate read-then-write quota race.
  const result = await db.prepare("INSERT INTO scan_requests (id,clerk_user_id,scan_type,status) SELECT ?,?,'url','reserved' WHERE (SELECT COUNT(*) FROM scan_requests WHERE clerk_user_id = ? AND status IN ('reserved','completed')) < 3").bind(id,userId,userId).run();
  return result.meta.changes === 1;
}
export async function finishScan(db, userId, id, completed) {
  const result = await db.prepare("UPDATE scan_requests SET status = ? WHERE id = ? AND clerk_user_id = ? AND status = 'reserved'").bind(completed?"completed":"failed",id,userId).run();
  if (result.meta.changes !== 1) throw new Error("Reservation settlement failed");
}
