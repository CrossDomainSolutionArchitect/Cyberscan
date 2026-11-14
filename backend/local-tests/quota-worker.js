import {
  QuotaDurableObject
} from "../src/durable/QuotaDurableObject.js";

export { QuotaDurableObject };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/health") {
      return Response.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    if (request.method !== "GET") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405 }
      );
    }

    try {
      const id = env.QUOTA_COUNTER.idFromName(
        "local-health-check"
      );

      const stub = env.QUOTA_COUNTER.get(id);

      const response = await stub.fetch(
        "https://internal/quota",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            key: "local-health-check",
            limit: 1,
            windowSeconds: 60
          })
        }
      );

      return Response.json({
        durableObjectAvailable: true,
        quotaResponseStatus: response.status,
        quotaResult: await response.json()
      });
    } catch {
      return Response.json(
        { error: "Local Durable Object test failed" },
        { status: 503 }
      );
    }
  }
};
