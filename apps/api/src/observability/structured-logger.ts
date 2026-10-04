import type { LoggerService } from "@nestjs/common";

import { redactValue } from "./redaction";

type LogLevel =
  | "info"
  | "warn"
  | "error"
  | "debug"
  | "verbose"
  | "fatal";

export class StructuredLogger implements LoggerService {
  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write("info", message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write("error", message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write("warn", message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write("debug", message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write("verbose", message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write("fatal", message, optionalParams);
  }

  event(
    level: LogLevel,
    event: string,
    fields: Record<string, unknown> = {},
  ): void {
    this.emit(level, {
      event,
      ...fields,
    });
  }

  private write(
    level: LogLevel,
    message: unknown,
    optionalParams: unknown[],
  ): void {
    const context =
      typeof optionalParams.at(-1) === "string"
        ? optionalParams.at(-1)
        : undefined;

    this.emit(level, {
      event: "application.log",
      message: redactValue(message),
      ...(context ? { context } : {}),
    });
  }

  private emit(
    level: LogLevel,
    payload: Record<string, unknown>,
  ): void {
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: "ayene-api",
      ...redactValue(payload) as Record<string, unknown>,
    });

    const stream =
      level === "error" || level === "fatal"
        ? process.stderr
        : process.stdout;

    stream.write(line + "\n");
  }
}
