import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from "@nestjs/common";

import type { AuthenticatedAdmin } from "../auth/auth.types";
import type { ErrorTracker } from "./error-tracker";
import { StructuredLogger } from "./structured-logger";

interface RequestLike {
  method?: string;
  originalUrl?: string;
  url?: string;
  requestId?: string;
  adminUser?: AuthenticatedAdmin;
}

interface ResponseLike {
  status(code: number): ResponseLike;
  json(body: unknown): void;
}

interface SafeHealthError {
  code: "HEALTH_NOT_READY";
  status: "degraded";
  dependencies: Record<string, unknown>;
}

function requestPath(request: RequestLike): string {
  return (request.originalUrl ?? request.url ?? "/").split("?")[0] ?? "/";
}

function safeHealthPayload(value: unknown): SafeHealthError | null {
  if (!value || typeof value !== "object") return null;

  const payload = value as Partial<SafeHealthError>;
  if (
    payload.code !== "HEALTH_NOT_READY" ||
    payload.status !== "degraded" ||
    !payload.dependencies ||
    typeof payload.dependencies !== "object"
  ) {
    return null;
  }

  return payload as SafeHealthError;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: StructuredLogger,
    private readonly errorTracker: ErrorTracker,
    private readonly production: boolean,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestLike>();
    const response = http.getResponse<ResponseLike>();
    const requestId = request.requestId ?? "unavailable";

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const path = requestPath(request);
    const method = request.method ?? "UNKNOWN";

    if (statusCode >= 500) {
      this.errorTracker.captureException(exception, {
        requestId,
        method,
        path,
        statusCode,
        actorId: request.adminUser?.id,
      });
    } else {
      this.logger.event("warn", "http.exception", {
        requestId,
        method,
        path,
        statusCode,
        actorId: request.adminUser?.id,
        errorName:
          exception instanceof Error
            ? exception.name
            : "HttpException",
      });
    }

    if (exception instanceof HttpException) {
      const original = exception.getResponse();
      const health = safeHealthPayload(original);

      if (health) {
        response.status(statusCode).json({
          ...health,
          requestId,
        });
        return;
      }

      if (statusCode < 500) {
        const payload =
          typeof original === "string"
            ? { message: original }
            : original;

        response.status(statusCode).json({
          ...(payload as Record<string, unknown>),
          requestId,
        });
        return;
      }
    }

    response.status(statusCode).json({
      statusCode,
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error.",
      requestId,
      ...(!this.production && exception instanceof Error
        ? { errorName: exception.name }
        : {}),
    });
  }
}
