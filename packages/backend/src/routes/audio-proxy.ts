export async function handleAudioProxy(url: URL, req?: Request): Promise<Response> {
  const targetUrl = url.searchParams.get("url");
  if (!targetUrl) {
    return Response.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return Response.json({ error: "Only http/https URLs are allowed" }, { status: 400 });
  }

  const headers: Record<string, string> = {
    "User-Agent": "live-dashboard/1.0",
  };
  const range = req?.headers.get("range");
  if (range) {
    headers["Range"] = range;
  }

  try {
    const resp = await fetch(targetUrl, {
      headers,
      signal: AbortSignal.timeout(30000),
    });

    const respHeaders = new Headers({
      "Content-Type": resp.headers.get("Content-Type") || "audio/mpeg",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    });

    const contentLength = resp.headers.get("Content-Length");
    if (contentLength) {
      respHeaders.set("Content-Length", contentLength);
    }

    const contentRange = resp.headers.get("Content-Range");
    if (contentRange) {
      respHeaders.set("Content-Range", contentRange);
    }

    return new Response(resp.body, {
      status: resp.status,
      headers: respHeaders,
    });
  } catch {
    return Response.json({ error: "Failed to fetch audio" }, { status: 502 });
  }
}
