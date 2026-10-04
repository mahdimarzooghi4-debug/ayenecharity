import assert from "node:assert/strict";
import test from "node:test";
import type { ArgumentsHost } from "@nestjs/common";

import type { ErrorTracker } from "./error-tracker";
import { GlobalExceptionFilter } from "./global-exception.filter";
import type { StructuredLogger } from "./structured-logger";

test("production 500 responses never expose error message or stack", () => {
  let responseStatus = 0;
  let responseBody: unknown;
  let captured = false;

  const logger = {
    event() {},
  } as unknown as StructuredLogger;

  const tracker: ErrorTracker = {
    captureException() {
      captured = true;
    },
  };

  const response = {
    status(code: number) {
      responseStatus = code;
      return response;
    },
    json(body: unknown) {
      responseBody = body;
    },
  };

  const host = {
    switchToHttp() {
      return {
        getRequest() {
          return {
            method: "GET",
            originalUrl: "/api/public/home?secret=value",
            requestId: "request-1",
          };
        },
        getResponse() {
          return response;
        },
      };
    },
  } as unknown as ArgumentsHost;

  const filter = new GlobalExceptionFilter(
    logger,
    tracker,
    true,
  );

  const error = new Error("database password=do-not-leak");
  error.stack = "PRIVATE STACK";

  filter.catch(error, host);

  assert.equal(captured, true);
  assert.equal(responseStatus, 500);
  assert.deepEqual(responseBody, {
    statusCode: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal server error.",
    requestId: "request-1",
  });
  assert.equal(JSON.stringify(responseBody).includes("PRIVATE"), false);
  assert.equal(JSON.stringify(responseBody).includes("do-not-leak"), false);
});
