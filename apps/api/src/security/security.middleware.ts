interface RequestLike {
  method?: string;
  originalUrl?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface ResponseLike {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(body: unknown): void;
}

type Next = () => void;

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function header(
  request: RequestLike,
  name: string,
): string | undefined {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function normalizedOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function configuredWebOrigins(): string[] {
  const raw =
    process.env.WEB_ORIGIN?.trim() ||
    "http://localhost:3000";

  return raw
    .split(",")
    .map((item) => normalizedOrigin(item.trim()))
    .filter((item): item is string => Boolean(item));
}

export function createSecurityHeadersMiddleware(
  production: boolean,
) {
  return (
    request: RequestLike,
    response: ResponseLike,
    next: Next,
  ): void => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=()",
    );
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );

    const path = (request.originalUrl ?? request.url ?? "/").split("?")[0] ?? "/";
    if (path.startsWith("/api/admin")) {
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("X-Robots-Tag", "noindex, nofollow");
    }

    if (production) {
      response.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains",
      );
    }

    next();
  };
}

export function createAdminCsrfMiddleware(
  allowedOrigins: readonly string[],
  production: boolean,
) {
  const allowed = new Set(allowedOrigins);

  return (
    request: RequestLike,
    response: ResponseLike,
    next: Next,
  ): void => {
    const method = (request.method ?? "GET").toUpperCase();
    const path = (request.originalUrl ?? request.url ?? "/").split("?")[0] ?? "/";

    if (
      !path.startsWith("/api/admin") ||
      !UNSAFE_METHODS.has(method)
    ) {
      next();
      return;
    }

    const originHeader = header(request, "origin");
    const refererHeader = header(request, "referer");
    const sourceOrigin =
      (originHeader && normalizedOrigin(originHeader)) ||
      (refererHeader && normalizedOrigin(refererHeader));

    if (!sourceOrigin) {
      if (!production) {
        next();
        return;
      }

      response.status(403).json({
        code: "CSRF_ORIGIN_REQUIRED",
        message: "A trusted browser origin is required.",
      });
      return;
    }

    if (!allowed.has(sourceOrigin)) {
      response.status(403).json({
        code: "CSRF_ORIGIN_REJECTED",
        message: "Request origin is not allowed.",
      });
      return;
    }

    next();
  };
}
