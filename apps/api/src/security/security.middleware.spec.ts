import assert from "node:assert/strict";
import test from "node:test";

import {
  createAdminCsrfMiddleware,
  createSecurityHeadersMiddleware,
} from "./security.middleware";

function responseHarness() {
  const headers = new Map<string, string>();
  let statusCode = 200;
  let body: unknown;

  const response = {
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
    status(code: number) {
      statusCode = code;
      return response;
    },
    json(value: unknown) {
      body = value;
    },
  };

  return {
    response,
    headers,
    statusCode: () => statusCode,
    body: () => body,
  };
}

test("production admin mutations require a trusted Origin or Referer", () => {
  const csrf = createAdminCsrfMiddleware(
    ["https://ayene.example.org"],
    true,
  );
  const harness = responseHarness();
  let nextCalled = false;

  csrf(
    {
      method: "PATCH",
      originalUrl: "/api/admin/settings/center",
      headers: {},
    },
    harness.response,
    () => {
      nextCalled = true;
    },
  );

  assert.equal(nextCalled, false);
  assert.equal(harness.statusCode(), 403);
  assert.deepEqual(harness.body(), {
    code: "CSRF_ORIGIN_REQUIRED",
    message: "A trusted browser origin is required.",
  });
});

test("trusted web origin passes the admin CSRF check", () => {
  const csrf = createAdminCsrfMiddleware(
    ["https://ayene.example.org"],
    true,
  );
  const harness = responseHarness();
  let nextCalled = false;

  csrf(
    {
      method: "POST",
      originalUrl: "/api/admin/auth/login",
      headers: {
        origin: "https://ayene.example.org",
      },
    },
    harness.response,
    () => {
      nextCalled = true;
    },
  );

  assert.equal(nextCalled, true);
  assert.equal(harness.statusCode(), 200);
});

test("security middleware sets hardened headers and noindex on admin", () => {
  const middleware = createSecurityHeadersMiddleware(true);
  const harness = responseHarness();

  middleware(
    {
      method: "GET",
      originalUrl: "/api/admin/users",
      headers: {},
    },
    harness.response,
    () => undefined,
  );

  assert.equal(
    harness.headers.get("X-Content-Type-Options"),
    "nosniff",
  );
  assert.equal(harness.headers.get("X-Frame-Options"), "DENY");
  assert.equal(
    harness.headers.get("X-Robots-Tag"),
    "noindex, nofollow",
  );
  assert.equal(harness.headers.get("Cache-Control"), "no-store");
  assert.match(
    harness.headers.get("Strict-Transport-Security") ?? "",
    /max-age=31536000/,
  );
});
