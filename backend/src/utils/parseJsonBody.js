const MAX_BODY_BYTES = 4096;

export async function parseJsonBody(request) {
  const contentType = request.headers.get("Content-Type");

  if (
    !contentType ||
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
      contentType.trim()
    )
  ) {
    return {
      valid: false,
      status: 415,
      error: "Content-Type must be application/json."
    };
  }

  const lengthHeader = request.headers.get("Content-Length");

  if (lengthHeader !== null) {
    if (!/^\d+$/.test(lengthHeader)) {
      return {
        valid: false,
        status: 400,
        error: "Invalid Content-Length header."
      };
    }

    if (Number(lengthHeader) > MAX_BODY_BYTES) {
      return {
        valid: false,
        status: 413,
        error: "Request body exceeds the size limit."
      };
    }
  }

  if (!request.body) {
    return {
      valid: false,
      status: 400,
      error: "Request body is required."
    };
  }

  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      totalBytes += value.byteLength;

      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();

        return {
          valid: false,
          status: 413,
          error: "Request body exceeds the size limit."
        };
      }

      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;

    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const text = new TextDecoder("utf-8", {
      fatal: true
    }).decode(bytes);

    return {
      valid: true,
      data: JSON.parse(text)
    };

  } catch {
    return {
      valid: false,
      status: 400,
      error: "Invalid JSON request body."
    };

  } finally {
    reader.releaseLock();
  }
}
