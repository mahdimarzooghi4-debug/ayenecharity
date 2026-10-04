import { randomUUID } from "node:crypto";

import { StructuredLogger } from "./structured-logger";

interface RequestLike {
  method?: string;
  originalUrl?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  requestId?: string;
}

interface ResponseLike {
  statusCode: number;
  setHeader(name: string, value: string): void;
  once(event: "finish", listener: () => void): void;
}

type Next = () => void;

function safePath(request: RequestLike): string {
  const raw = request.originalUrl ?? request.url ?? "/";
  return raw.split("?")[0] ?? "/";
}

export function createHttpLoggingMiddleware(
  logger: StructuredLogger,
) {
  return (
    request: RequestLike,
    response: ResponseLike,
    next: Next,
  ): void => {
    const requestId = randomUUID();
    const startedAt = process.hrtime.bigint();

    request.requestId = requestId;
    response.setHeader("X-Request-Id", requestId);

    response.once("finish", () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;

      logger.event("info", "http.request", {
        requestId,
        method: request.method ?? "UNKNOWN",
        path: safePath(request),
        statusCode: response.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      });
    });

    next();
  };
}
