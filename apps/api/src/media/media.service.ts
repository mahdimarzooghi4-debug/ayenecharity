import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AdminRole, MediaPurpose, MediaVisibility } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";

import type { AuthenticatedAdmin } from "../auth/auth.types";
import { hasPermissions } from "../auth/permissions";
import { PrismaService } from "../database/prisma.service";
import {
  accessPermissionForPurpose,
  extensionForMimeType,
  isAdminUploadPurpose,
  MediaPolicyError,
  uploadPermissionsForPurpose,
  validateMediaUpload,
} from "./media-policy";
import type {
  MediaAccessResponse,
  StoredMediaResponse,
  UploadedMemoryFile,
} from "./media.types";
import { ObjectStorageService } from "./object-storage.service";

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
  ) {}

  async uploadForAdmin(
    purpose: MediaPurpose,
    projectId: string | undefined,
    file: UploadedMemoryFile | undefined,
    admin: AuthenticatedAdmin,
  ): Promise<StoredMediaResponse> {
    if (!isAdminUploadPurpose(purpose)) {
      throw new BadRequestException({
        code: "MEDIA_PURPOSE_NOT_ADMIN_UPLOADABLE",
        message: "This media purpose cannot be uploaded through the generic admin endpoint.",
      });
    }

    this.assertAdminCanUpload(admin, purpose);

    return this.storeFile({
      purpose,
      projectId,
      file,
      uploadedById: admin.id,
    });
  }

  async storeReceipt(params: {
    projectId: string;
    file: UploadedMemoryFile | undefined;
  }): Promise<StoredMediaResponse> {
    return this.storeFile({
      purpose: MediaPurpose.RECEIPT,
      projectId: params.projectId,
      file: params.file,
    });
  }

  async discardUnreferencedReceipt(id: string): Promise<void> {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        receiptFor: { select: { id: true } },
      },
    });

    if (
      !asset ||
      asset.purpose !== MediaPurpose.RECEIPT ||
      asset.receiptFor
    ) {
      return;
    }

    await this.storage.deleteObject(asset.storageKey);
    await this.prisma.mediaAsset.delete({ where: { id: asset.id } });
  }

  async getAdminAccessUrl(
    id: string,
    admin: AuthenticatedAdmin,
  ): Promise<MediaAccessResponse> {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException({
        code: "MEDIA_NOT_FOUND",
        message: "Media asset was not found.",
      });
    }

    this.assertAdminCanAccess(admin, asset.purpose);

    if (asset.visibility === MediaVisibility.PUBLIC) {
      const publicUrl = this.storage.publicUrl(asset.storageKey);

      if (publicUrl) {
        return {
          url: publicUrl,
          expiresInSeconds: null,
        };
      }
    }

    return this.storage.createSignedGetUrl(asset.storageKey);
  }

  async removeUnreferencedAsset(id: string, admin: AuthenticatedAdmin): Promise<void> {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        projectMainImageFor: { select: { id: true }, take: 1 },
        receiptFor: { select: { id: true } },
        documentFor: { select: { id: true }, take: 1 },
        heroSlides: { select: { id: true }, take: 1 },
      },
    });

    if (!asset) {
      return;
    }

    this.assertAdminCanAccess(admin, asset.purpose);

    const isReferenced =
      Boolean(asset.projectId) ||
      asset.projectMainImageFor.length > 0 ||
      Boolean(asset.receiptFor) ||
      asset.documentFor.length > 0 ||
      asset.heroSlides.length > 0;

    if (isReferenced) {
      throw new BadRequestException({
        code: "MEDIA_STILL_REFERENCED",
        message: "Media must be detached from its owning entity before deletion.",
      });
    }

    await this.storage.deleteObject(asset.storageKey);
    await this.prisma.mediaAsset.delete({ where: { id: asset.id } });
  }

  private async storeFile(params: {
    purpose: MediaPurpose;
    projectId?: string;
    file: UploadedMemoryFile | undefined;
    uploadedById?: string;
  }): Promise<StoredMediaResponse> {
    const file = params.file;

    if (!file?.buffer) {
      throw new BadRequestException({
        code: "MEDIA_FILE_REQUIRED",
        message: "A file is required.",
      });
    }

    let policy;
    try {
      policy = validateMediaUpload(params.purpose, file.mimetype, file.size);
    } catch (error) {
      if (error instanceof MediaPolicyError) {
        throw new BadRequestException({
          code: "INVALID_MEDIA_UPLOAD",
          message: error.message,
        });
      }

      throw error;
    }

    if (file.buffer.byteLength !== file.size) {
      throw new BadRequestException({
        code: "INVALID_MEDIA_UPLOAD",
        message: "Uploaded file size does not match the received payload.",
      });
    }

    const extension = extensionForMimeType(file.mimetype);
    const storageKey = this.createStorageKey(params.purpose, extension);
    const checksum = createHash("sha256").update(file.buffer).digest("hex");

    const asset = await this.prisma.mediaAsset.create({
      data: {
        storageKey,
        originalName: file.originalname.slice(0, 255),
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        visibility: policy.visibility,
        purpose: params.purpose,
        checksum,
        projectId: params.projectId,
        uploadedById: params.uploadedById,
      },
    });

    try {
      await this.storage.putObject({
        key: storageKey,
        body: file.buffer,
        contentType: file.mimetype,
        cacheControl:
          policy.visibility === MediaVisibility.PUBLIC
            ? "public, max-age=31536000, immutable"
            : "private, no-store",
      });
    } catch (error) {
      await this.prisma.mediaAsset.delete({ where: { id: asset.id } }).catch(() => undefined);
      throw error;
    }

    return this.toStoredMediaResponse(asset);
  }

  private createStorageKey(purpose: MediaPurpose, extension: string): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");

    return [
      purpose.toLowerCase().replaceAll("_", "-"),
      String(year),
      month,
      randomUUID() + "." + extension,
    ].join("/");
  }

  private assertAdminCanUpload(admin: AuthenticatedAdmin, purpose: MediaPurpose): void {
    if (admin.role === AdminRole.SUPER_ADMIN) {
      return;
    }

    const candidates = uploadPermissionsForPurpose(purpose);
    if (candidates.length === 0 || !candidates.some((permission) => hasPermissions(admin.role, [permission]))) {
      throw new ForbiddenException("Insufficient permissions for this media upload.");
    }
  }

  private assertAdminCanAccess(admin: AuthenticatedAdmin, purpose: MediaPurpose): void {
    if (admin.role === AdminRole.SUPER_ADMIN) {
      return;
    }

    const permission = accessPermissionForPurpose(purpose);

    if (!permission || !hasPermissions(admin.role, [permission])) {
      throw new ForbiddenException("Insufficient permissions for this media asset.");
    }
  }

  private toStoredMediaResponse(asset: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: bigint;
    purpose: MediaPurpose;
    visibility: MediaVisibility;
    storageKey: string;
  }): StoredMediaResponse {
    return {
      id: asset.id,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes.toString(),
      purpose: asset.purpose,
      visibility: asset.visibility,
      publicUrl:
        asset.visibility === MediaVisibility.PUBLIC
          ? this.storage.publicUrl(asset.storageKey)
          : null,
    };
  }
}
