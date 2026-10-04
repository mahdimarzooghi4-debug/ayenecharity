import assert from "node:assert/strict";
import test from "node:test";

import {
  trustProxyHops,
  validateRuntimeConfiguration,
} from "./runtime-config";

const keys = [
  "NODE_ENV",
  "DATABASE_URL",
  "SESSION_SECRET",
  "WEB_ORIGIN",
  "S3_BUCKET",
  "TRUST_PROXY_HOPS",
] as const;

function withEnvironment(
  values: Partial<Record<(typeof keys)[number], string | undefined>>,
  callback: () => void,
): void {
  const previous = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  ) as Record<(typeof keys)[number], string | undefined>;

  try {
    for (const key of keys) {
      const value = values[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    callback();
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("production rejects placeholder secrets and development database credentials", () => {
  withEnvironment(
    {
      NODE_ENV: "production",
      DATABASE_URL:
        "postgresql://postgres:postgres@db:5432/ayenecharity",
      SESSION_SECRET:
        "replace-with-at-least-32-random-characters",
      WEB_ORIGIN: "https://ayene.example.org",
      S3_BUCKET: "ayene-prod",
    },
    () => {
      assert.throws(() => validateRuntimeConfiguration());
    },
  );
});

test("production accepts non-placeholder secret-store values", () => {
  withEnvironment(
    {
      NODE_ENV: "production",
      DATABASE_URL:
        "postgresql://app_user:strong-db-secret@db:5432/ayenecharity",
      SESSION_SECRET:
        "mM7WQ2f8zK1yP9vS4xR6nT3cH5jL8uB0",
      WEB_ORIGIN: "https://ayene.example.org",
      S3_BUCKET: "ayene-prod",
    },
    () => {
      assert.doesNotThrow(() =>
        validateRuntimeConfiguration(),
      );
    },
  );
});

test("proxy trust accepts only a bounded hop count", () => {
  withEnvironment(
    { TRUST_PROXY_HOPS: "1" },
    () => assert.equal(trustProxyHops(), 1),
  );

  withEnvironment(
    { TRUST_PROXY_HOPS: "99" },
    () => assert.throws(() => trustProxyHops()),
  );
});
