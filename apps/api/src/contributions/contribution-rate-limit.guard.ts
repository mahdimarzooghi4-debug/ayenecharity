import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface RateBucket {
  count: number;
  resetAt: number;
}

interface RateLimitedRequest {
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
}

interface RateLimitedResponse {
  setHeader(name: string, value: string): void;
}

@Injectable()
export class ContributionRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, RateBucket>();
  private requestCount = 0;

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<RateLimitedRequest>();
    const response = http.getResponse<RateLimitedResponse>();
    const now = Date.now();
    const key = request.ip ?? request.socket?.remoteAddress ?? "unknown";

    this.requestCount += 1;
    if (this.requestCount % 100 === 0) {
      this.removeExpiredBuckets(now);
    }

    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + WINDOW_MS,
      });
      return true;
    }

    if (current.count >= MAX_ATTEMPTS) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000),
      );
      response.setHeader("Retry-After", String(retryAfterSeconds));

      throw new HttpException(
        {
          code: "CONTRIBUTION_RATE_LIMITED",
          message: "Too many contribution submissions. Please try again later.",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
    return true;
  }

  private removeExpiredBuckets(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
