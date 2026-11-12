import { errorResponse } from "../utils/response.js";

function getAllowedOrigins(env) {
  const configured = env?.ALLOWED_ORIGINS;

  if (typeof configured !== "string" || !configured.trim()) {
    return new Set();
  }

  return new Set(
    configured
      .split(",")
      .map(origin => origin.trim())
      .filter(Boolean)
  );
}

const ALLOWED_METHODS = new Set(["GET", "POST"]);
const ALLOWED_HEADERS = new Set(["content-type"]);

export function applyCors(request, response, env) {
  const origin = request.headers.get("Origin");

  if (!origin || !getAllowedOrigins(env).has(origin)) {
    return response;
  }

  const headers = new Headers(response.headers);

  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function handlePreflight(request, env) {
  if (request.method !== "OPTIONS") {
    return null;
  }

  const origin = request.headers.get("Origin");

  if (!origin || !getAllowedOrigins(env).has(origin)) {
    return errorResponse(
      "CORS_ORIGIN_DENIED",
      "Origin is not permitted.",
      403
    );
  }

  const method = request.headers.get(
    "Access-Control-Request-Method"
  );

  if (!ALLOWED_METHODS.has(method)) {
    return errorResponse(
      "CORS_METHOD_DENIED",
      "Requested method is not permitted.",
      405
    );
  }

  const requestedHeaders = (
    request.headers.get("Access-Control-Request-Headers") || ""
  )
    .split(",")
    .map(header => header.trim().toLowerCase())
    .filter(Boolean);

  const invalidHeader = requestedHeaders.some(
    header => !ALLOWED_HEADERS.has(header)
  );

  if (invalidHeader) {
    return errorResponse(
      "CORS_HEADERS_DENIED",
      "Requested headers are not permitted.",
      403
    );
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
      "Vary": "Origin",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY"
    }
  });
}
