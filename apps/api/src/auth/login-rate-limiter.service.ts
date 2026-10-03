import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";

interface AttemptBucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class LoginRateLimiterService {
  private readonly buckets = new Map<string, AttemptBucket>();
  private readonly windowMs = 15 * 60 * 1000;

  assertAllowed(ipAddress: string | undefined, normalizedEmail: string): void {
    const now = Date.now();
    const ipKey = `ip:${ipAddress ?? "unknown"}`;
    const identityKey = `identity:${this.hash(normalizedEmail)}`;

    if (this.count(ipKey, now) >= 20 || this.count(identityKey, now) >= 5) {
      throw new HttpException("Too many login attempts. Try again later.", HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  recordFailure(ipAddress: string | undefined, normalizedEmail: string): void {
    const now = Date.now();
    this.increment(`ip:${ipAddress ?? "unknown"}`, now);
    this.increment(`identity:${this.hash(normalizedEmail)}`, now);
  }

  clearIdentity(normalizedEmail: string): void {
    this.buckets.delete(`identity:${this.hash(normalizedEmail)}`);
  }

  private count(key: string, now: number): number {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return 0;
    }

    if (bucket.resetAt <= now) {
      this.buckets.delete(key);
      return 0;
    }

    return bucket.count;
  }

  private increment(key: string, now: number): void {
    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return;
    }

    current.count += 1;
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }
}
