import {
  successResponse,
  errorResponse
} from "./utils/response.js";

import {
  applyCors,
  handlePreflight
} from "./middleware/cors.js";

export default {
  async fetch(request, env) {
    try {
      const preflightResponse = handlePreflight(request, env);

      if (preflightResponse) {
        return preflightResponse;
      }

      const url = new URL(request.url);
      let response;

      if (url.pathname === "/v1/health") {
        if (request.method !== "GET") {
          response = errorResponse(
            "METHOD_NOT_ALLOWED",
            "This endpoint only supports GET requests.",
            405
          );
        } else {
          response = successResponse({
            status: "ok",
            service: "cyberscan-api",
            version: "1.0.0"
          });
        }
      } else {
        response = errorResponse(
          "NOT_FOUND",
          "The requested API endpoint does not exist.",
          404
        );
      }

      return applyCors(request, response, env);

    } catch (error) {
      console.error("Unhandled API error", {
        name: error?.name ?? "UnknownError"
      });

      return applyCors(
        request,
        errorResponse(
          "INTERNAL_SERVER_ERROR",
          "An unexpected server error occurred.",
          500
        ),
        env
      );
    }
  }
};
