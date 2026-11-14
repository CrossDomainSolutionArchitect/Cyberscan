import { DurableObject } from "cloudflare:workers";
import { QuotaCounter } from "../security/quotaCounter.js";
import { processQuotaAlarm } from "../security/quotaAlarmLifecycle.js";

export class QuotaDurableObject extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);

    this.counter = new QuotaCounter(ctx.storage);
  }

  async alarm() {
    await processQuotaAlarm(this.ctx.storage);
  }

  async fetch(request) {
    if (request.method !== "POST") {
      return Response.json(
        { error: "Method not allowed." },
        { status: 405 }
      );
    }

    try {
      const body = await request.json();

      if (
        body === null ||
        typeof body !== "object" ||
        Array.isArray(body)
      ) {
        return Response.json(
          { error: "Invalid request." },
          { status: 400 }
        );
      }

      const { key, limit, windowSeconds } = body;

      const result = await this.counter.consume(
        key,
        limit,
        windowSeconds
      );

      return Response.json(result, {
        status: result.allowed
          ? 200
          : result.retryAfterSeconds
            ? 429
            : 503
      });

    } catch {
      return Response.json(
        { error: "Quota service unavailable." },
        { status: 503 }
      );
    }
  }
}
