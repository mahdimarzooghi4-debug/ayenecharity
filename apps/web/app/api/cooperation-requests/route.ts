const API_BASE = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3001"
).replace(/\/+$/, "");

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await request.text();

    const upstream = await fetch(
      API_BASE + "/api/cooperation-requests",
      {
        method: "POST",
        body: payload,
        cache: "no-store",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
      },
    );

    const body = await upstream.text();
    const headers = new Headers();
    headers.set(
      "content-type",
      upstream.headers.get("content-type") ??
        "application/json; charset=utf-8",
    );

    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter) {
      headers.set("retry-after", retryAfter);
    }

    return new Response(body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return Response.json(
      {
        code: "COOPERATION_REQUEST_UPSTREAM_UNAVAILABLE",
        message: "Cooperation request service is temporarily unavailable.",
      },
      { status: 502 },
    );
  }
}
