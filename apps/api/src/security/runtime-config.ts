function requireValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(name + " must be configured in production.");
  }
  return value;
}

function isPlaceholder(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("replace-with") ||
    normalized.includes("changeme") ||
    normalized.includes("example.test") ||
    normalized.includes("example.invalid")
  );
}

export function validateRuntimeConfiguration(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const databaseUrl = requireValue("DATABASE_URL");
  const sessionSecret = requireValue("SESSION_SECRET");
  const webOrigin = requireValue("WEB_ORIGIN");
  requireValue("S3_BUCKET");

  if (sessionSecret.length < 32 || isPlaceholder(sessionSecret)) {
    throw new Error(
      "SESSION_SECRET must be a non-placeholder secret with at least 32 characters.",
    );
  }

  if (
    isPlaceholder(databaseUrl) ||
    databaseUrl.includes("postgres:postgres@")
  ) {
    throw new Error(
      "DATABASE_URL must not use development or placeholder credentials in production.",
    );
  }

  const origins = webOrigin
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error("WEB_ORIGIN must include at least one origin.");
  }

  for (const origin of origins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error("WEB_ORIGIN contains an invalid URL.");
    }

    if (parsed.protocol !== "https:") {
      throw new Error(
        "WEB_ORIGIN must use HTTPS in production.",
      );
    }
  }
}

export function trustProxyHops(): number {
  const value = Number(process.env.TRUST_PROXY_HOPS ?? "0");
  if (!Number.isInteger(value) || value < 0 || value > 10) {
    throw new Error(
      "TRUST_PROXY_HOPS must be an integer between 0 and 10.",
    );
  }

  return value;
}
