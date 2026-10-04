import {
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";

import { PrismaService } from "./database/prisma.service";
import { ObjectStorageService } from "./media/object-storage.service";

interface DependencyHealth {
  status: "ok" | "unavailable";
}

interface ReadinessResponse {
  status: "ok";
  dependencies: {
    database: DependencyHealth;
    objectStorage: DependencyHealth;
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
  ) {}

  live() {
    return {
      status: "ok" as const,
      service: "ayene-api",
    };
  }

  async ready(): Promise<ReadinessResponse> {
    const [database, objectStorage] = await Promise.all([
      this.checkDatabase(),
      this.storage.healthCheck(),
    ]);

    const dependencies = {
      database,
      objectStorage,
    };

    if (
      database.status !== "ok" ||
      objectStorage.status !== "ok"
    ) {
      throw new ServiceUnavailableException({
        code: "HEALTH_NOT_READY",
        status: "degraded",
        dependencies,
      });
    }

    return {
      status: "ok",
      dependencies,
    };
  }

  private async checkDatabase(): Promise<DependencyHealth> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok" };
    } catch {
      return { status: "unavailable" };
    }
  }
}
