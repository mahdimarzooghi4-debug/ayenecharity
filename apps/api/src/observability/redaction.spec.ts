import assert from "node:assert/strict";
import test from "node:test";

import { redactText, redactValue } from "./redaction";

test("redacts secret object keys recursively", () => {
  const result = redactValue({
    user: "admin",
    password: "super-secret",
    nested: {
      sessionToken: "token-value",
      safe: "ok",
    },
  });

  assert.deepEqual(result, {
    user: "admin",
    password: "[REDACTED]",
    nested: {
      sessionToken: "[REDACTED]",
      safe: "ok",
    },
  });
});

test("redacts bearer tokens, session cookies and URL credentials", () => {
  const value =
    "Bearer abc.def ayene_admin_session=session-value " +
    "postgresql://postgres:database-password@db:5432/app " +
    "api_key=top-secret";

  const result = redactText(value);

  assert.equal(result.includes("abc.def"), false);
  assert.equal(result.includes("session-value"), false);
  assert.equal(result.includes("database-password"), false);
  assert.equal(result.includes("top-secret"), false);
  assert.equal(result.includes("[REDACTED]"), true);
});
