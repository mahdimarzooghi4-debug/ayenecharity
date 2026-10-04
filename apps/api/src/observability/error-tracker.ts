import { StructuredLogger } from "./structured-logger";

export interface ErrorTrackingContext {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  actorId?: string;
}

export interface ErrorTracker {
  captureException(
    error: unknown,
    context: ErrorTrackingContext,
  ): void;
}

/**
 * V1 integration seam for an external error tracker.
 *
 * It deliberately emits only a redacted structured event today. A provider
 * adapter (for example Sentry) can replace this implementation later without
 * changing the global exception filter.
 */
export class StructuredErrorTracker implements ErrorTracker {
  constructor(private readonly logger: StructuredLogger) {}

  captureException(
    error: unknown,
    context: ErrorTrackingContext,
  ): void {
    this.logger.event("error", "error.capture", {
      ...context,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
            }
          : {
              name: "UnknownError",
              message: "Non-Error exception",
            },
    });
  }
}
