const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY"
};

export function successResponse(data, status = 200) {
  return Response.json(
    {
      success: true,
      data
    },
    {
      status,
      headers: SECURITY_HEADERS
    }
  );
}

export function errorResponse(
  code,
  message,
  status = 400
) {
  return Response.json(
    {
      success: false,
      error: {
        code,
        message
      }
    },
    {
      status,
      headers: SECURITY_HEADERS
    }
  );
}
