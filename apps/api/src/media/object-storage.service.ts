import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ObjectStorageService {
  private client?: S3Client;

  constructor(private readonly config: ConfigService) {}

  async putObject(params: {
    key: string;
    body: Buffer;
    contentType: string;
    cacheControl: string;
  }): Promise<void> {
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: this.getBucket(),
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
        CacheControl: params.cacheControl,
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.getClient().send(
      new DeleteObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
      }),
    );
  }

  async createSignedGetUrl(key: string): Promise<{ url: string; expiresInSeconds: number }> {
    const expiresInSeconds = this.getSignedUrlTtlSeconds();
    const url = await getSignedUrl(
      this.getClient(),
      new GetObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
      }),
      { expiresIn: expiresInSeconds },
    );

    return { url, expiresInSeconds };
  }

  async healthCheck(): Promise<{ status: "ok" | "unavailable" }> {
    try {
      await this.getClient().send(
        new HeadBucketCommand({
          Bucket: this.getBucket(),
        }),
      );
      return { status: "ok" };
    } catch {
      return { status: "unavailable" };
    }
  }

  publicUrl(key: string): string | null {
    const baseUrl = this.config.get<string>("PUBLIC_MEDIA_BASE_URL")?.trim();

    if (!baseUrl) {
      return null;
    }

    const encodedKey = key
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    return baseUrl.replace(/\/+$/, "") + "/" + encodedKey;
  }

  private getClient(): S3Client {
    if (this.client) {
      return this.client;
    }

    const accessKeyId = this.config.get<string>("S3_ACCESS_KEY_ID")?.trim();
    const secretAccessKey = this.config.get<string>("S3_SECRET_ACCESS_KEY")?.trim();

    if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) {
      throw new InternalServerErrorException(
        "Both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be configured together.",
      );
    }

    this.client = new S3Client({
      region: this.config.get<string>("S3_REGION")?.trim() || "auto",
      endpoint: this.config.get<string>("S3_ENDPOINT")?.trim() || undefined,
      forcePathStyle: this.config.get<string>("S3_FORCE_PATH_STYLE") === "true",
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
    });

    return this.client;
  }

  private getBucket(): string {
    const bucket = this.config.get<string>("S3_BUCKET")?.trim();

    if (!bucket) {
      throw new InternalServerErrorException("S3_BUCKET is not configured.");
    }

    return bucket;
  }

  private getSignedUrlTtlSeconds(): number {
    const configured = Number(this.config.get<string>("MEDIA_SIGNED_URL_TTL_SECONDS"));

    if (!Number.isFinite(configured)) {
      return 300;
    }

    return Math.min(900, Math.max(60, Math.trunc(configured)));
  }
}
