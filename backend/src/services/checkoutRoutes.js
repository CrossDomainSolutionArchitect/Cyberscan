import {verifyClerkToken} from "../security/clerkVerifier.js";
import {enforceRateLimit} from "../security/rateLimiter.js";
import {ensureUser} from "./entitlements.js";
import {successResponse,errorResponse} from "../utils/response.js";

const PAYSTACK_URL = "https://api.paystack.co/transaction/initialize";
const CLERK_API = "https://api.clerk.com/v1";
const PLAN_CODES = new Set(["basic","pro","enterprise"]);

export async function resolveVerifiedEmail(userId, clerkSecret, fetcher = fetch) {
  if (typeof clerkSecret !== "string" || !clerkSecret.startsWith("sk_")) throw new Error("Clerk server credentials unavailable");
  const response = await fetcher(`${CLERK_API}/users/${encodeURIComponent(userId)}`, {
    headers: {Authorization:`Bearer ${clerkSecret}`},
    redirect:"manual",
    signal:AbortSignal.timeout(8000)
  });
  if ((response.status >= 300 && response.status < 400) || !response.ok) {
    throw new Error("Clerk user lookup failed");
  }
  const user = await response.json();
  if (user?.id !== userId || !Array.isArray(user.email_addresses)) throw new Error("Clerk identity mismatch");
  const email = user.email_addresses.find(e => e.id === user.primary_email_address_id && e.verification?.status === "verified");
  if (!email || typeof email.email_address !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.email_address)) throw new Error("Verified primary email required");
  return email.email_address;
}

export async function checkoutRoute(request, env, deps = {}) {
  if (request.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED","Use POST.",405);
  const bearer = /^Bearer ([^\s]+)$/i.exec(request.headers.get("Authorization") || "");
  let identity;
  try { identity = bearer && await (deps.verify || verifyClerkToken)(bearer[1]); }
  catch { return errorResponse("AUTH_UNAVAILABLE","Authentication temporarily unavailable.",503); }
  if (!identity) return errorResponse("UNAUTHORIZED","Sign in to CyberScan.",401);
  if (!env.DB) return errorResponse("DATABASE_UNAVAILABLE","Customer database unavailable.",503);
  const denied = await enforceRateLimit(env,"scanUser",identity.userId);
  if (denied) return denied;
  let body;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 1024) return errorResponse("BODY_TOO_LARGE","Request too large.",413);
    body = JSON.parse(raw);
  } catch { return errorResponse("INVALID_BODY","Invalid JSON request.",400); }
  if (!body || Array.isArray(body) || typeof body !== "object" ||
      Object.keys(body).length !== 1 || !PLAN_CODES.has(body.plan)) {
    return errorResponse("INVALID_PLAN","Select a valid subscription plan.",400);
  }
  const key = env.PAYSTACK_SECRET_KEY;
  if (typeof key !== "string" || !key.startsWith("sk_test_")) {
    return errorResponse("PAYMENTS_NOT_CONFIGURED","Paystack test checkout is unavailable.",503);
  }
  const plan = await env.DB.prepare("SELECT code,amount_minor,currency,interval,paystack_plan_code FROM billing_plans WHERE code=? AND is_active=1").bind(body.plan).first();
  if (!plan || !Number.isSafeInteger(plan.amount_minor) || plan.currency !== "ZAR" || plan.interval !== "monthly" ||
      typeof plan.paystack_plan_code !== "string" || !/^PLN_[A-Za-z0-9]+$/.test(plan.paystack_plan_code)) {
    return errorResponse("PLAN_UNAVAILABLE","This plan is not yet available for checkout.",503);
  }
  let email;
  try { email = await (deps.resolveEmail || resolveVerifiedEmail)(identity.userId,env.CLERK_SECRET_KEY,deps.fetcher || fetch); }
  catch { return errorResponse("VERIFIED_EMAIL_REQUIRED","A verified primary email is required for checkout.",422); }
  await ensureUser(env.DB,identity.userId);
  const reference = `cs_${crypto.randomUUID().replace(/-/g,"")}`;
  let checkout;
  try {
    const response = await (deps.fetcher || fetch)(PAYSTACK_URL,{
      method:"POST",
      headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        email,
        amount:plan.amount_minor,
        currency:"ZAR",
        plan:plan.paystack_plan_code,
        reference,
        callback_url:"https://cyberscan.co.za/?payment=return"
      }),
      redirect:"manual",
      signal:AbortSignal.timeout(10000)
    });
    if ((response.status >= 300 && response.status < 400) || !response.ok) {
      throw new Error("Paystack initialization failed");
    }
    const payload = await response.json();
    if (payload?.status !== true || payload.data?.reference !== reference) throw new Error("Paystack reference mismatch");
    const url = new URL(payload.data.authorization_url);
    if (url.protocol !== "https:" || url.hostname !== "checkout.paystack.com" || url.username || url.password) throw new Error("Unexpected checkout destination");
    checkout = url.href;
  } catch {
    return errorResponse("CHECKOUT_UNAVAILABLE","Unable to initialize checkout. Please retry.",503);
  }
  try {
    await env.DB.prepare("INSERT INTO billing_transactions(reference,clerk_user_id,plan_code,amount_minor,currency,status) VALUES (?,?,?,?,?,'initialized')")
      .bind(reference,identity.userId,plan.code,plan.amount_minor,"ZAR").run();
  } catch {
    return errorResponse("CHECKOUT_UNAVAILABLE","Unable to record checkout. Please retry.",503);
  }
  return successResponse({reference,authorization_url:checkout,plan:plan.code,currency:"ZAR",amount_minor:plan.amount_minor});
}
