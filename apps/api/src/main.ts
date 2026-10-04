import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { StructuredErrorTracker } from "./observability/error-tracker";
import { GlobalExceptionFilter } from "./observability/global-exception.filter";
import { createHttpLoggingMiddleware } from "./observability/http-logging.middleware";
import { StructuredLogger } from "./observability/structured-logger";
import {
  configuredWebOrigins,
  createAdminCsrfMiddleware,
  createSecurityHeadersMiddleware,
} from "./security/security.middleware";
import {
  trustProxyHops,
  validateRuntimeConfiguration,
} from "./security/runtime-config";

async function bootstrap(): Promise<void> {
  validateRuntimeConfiguration();

  const production = process.env.NODE_ENV === "production";
  const logger = new StructuredLogger();
  const errorTracker = new StructuredErrorTracker(logger);
  const allowedOrigins = configuredWebOrigins();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(logger);
  app.setGlobalPrefix("api");
  app.enableShutdownHooks();

  const express = app.getHttpAdapter().getInstance() as {
    set(name: string, value: number): void;
    disable(name: string): void;
  };

  express.disable("x-powered-by");

  const proxyHops = trustProxyHops();
  if (proxyHops > 0) {
    express.set("trust proxy", proxyHops);
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Accept"],
  });

  app.use(createHttpLoggingMiddleware(logger));
  app.use(createSecurityHeadersMiddleware(production));
  app.use(createAdminCsrfMiddleware(allowedOrigins, production));

  app.useGlobalFilters(
    new GlobalExceptionFilter(
      logger,
      errorTracker,
      production,
    ),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, "0.0.0.0");

  logger.event("info", "application.ready", {
    port,
    environment: process.env.NODE_ENV ?? "development",
  });
}

void bootstrap();
