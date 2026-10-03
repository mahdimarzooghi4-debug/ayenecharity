import assert from "node:assert/strict";
import test from "node:test";

import { createSessionToken, hashSessionToken, readCookie } from "./session-token";

test("session token is random and base64url safe", () => {
  const first = createSessionToken();
  const second = createSessionToken();

  assert.notEqual(first, second);
  assert.match(first, /^[A-Za-z0-9_-]+$/);
});

test("session hashes are deterministic for a secret and token", () => {
  const token = "token-value";
  const secret = "a-secure-secret-that-is-long-enough-123";

  assert.equal(hashSessionToken(token, secret), hashSessionToken(token, secret));
  assert.notEqual(
    hashSessionToken(token, secret),
    hashSessionToken(token, "another-secure-secret-that-is-long-456"),
  );
});

test("cookie reader extracts the requested cookie only", () => {
  const header = "theme=dark; ayene_admin_session=abc%20123; locale=fa";

  assert.equal(readCookie(header, "ayene_admin_session"), "abc 123");
  assert.equal(readCookie(header, "missing"), undefined);
});
