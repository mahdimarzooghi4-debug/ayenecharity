import { MediaPurpose, MediaVisibility } from "@prisma/client";

import { Permission } from "../auth/permissions";

export interface MediaPolicy {
  visibility: MediaVisibility;
  maxBytes: number;
  allowedMimeTypes: readonly string[];
}

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const DOCUMENT_MIME_TYPES = [...IMAGE_MIME_TYPES, "application/pdf"] as const;

export const MEDIA_POLICIES: Record<MediaPurpose, MediaPolicy> = {
  [MediaPurpose.PROJECT_IMAGE]: {
    visibility: MediaVisibility.PUBLIC,
    maxBytes: 8 * 1024 * 1024,
    allowedMimeTypes: IMAGE_MIME_TYPES,
  },
  [MediaPurpose.HERO_IMAGE]: {
    visibility: MediaVisibility.PUBLIC,
    maxBytes: 8 * 1024 * 1024,
    allowedMimeTypes: IMAGE_MIME_TYPES,
  },
  [MediaPurpose.RECEIPT]: {
    visibility: MediaVisibility.PRIVATE,
    maxBytes: 5 * 1024 * 1024,
    allowedMimeTypes: DOCUMENT_MIME_TYPES,
  },
  [MediaPurpose.TRANSPARENCY_DOCUMENT]: {
    visibility: MediaVisibility.PRIVATE,
    maxBytes: 15 * 1024 * 1024,
    allowedMimeTypes: DOCUMENT_MIME_TYPES,
  },
  [MediaPurpose.OTHER]: {
    visibility: MediaVisibility.PRIVATE,
    maxBytes: 5 * 1024 * 1024,
    allowedMimeTypes: DOCUMENT_MIME_TYPES,
  },
};

export const MAX_HTTP_UPLOAD_BYTES = Math.max(
  ...Object.values(MEDIA_POLICIES).map((policy) => policy.maxBytes),
);

export class MediaPolicyError extends Error {}

export function validateMediaUpload(
  purpose: MediaPurpose,
  mimeType: string,
  sizeBytes: number,
): MediaPolicy {
  const policy = MEDIA_POLICIES[purpose];

  if (!policy.allowedMimeTypes.includes(mimeType)) {
    throw new MediaPolicyError("File type is not allowed for this media purpose.");
  }

  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > policy.maxBytes) {
    throw new MediaPolicyError("File size is outside the allowed range.");
  }

  return policy;
}

export function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      throw new MediaPolicyError("Unsupported MIME type.");
  }
}

export function accessPermissionForPurpose(purpose: MediaPurpose): Permission | null {
  switch (purpose) {
    case MediaPurpose.PROJECT_IMAGE:
      return Permission.PROJECTS_VIEW;
    case MediaPurpose.HERO_IMAGE:
      return Permission.CONTENT_VIEW;
    case MediaPurpose.RECEIPT:
      return Permission.CONTRIBUTIONS_VIEW;
    case MediaPurpose.TRANSPARENCY_DOCUMENT:
      return Permission.TRANSPARENCY_VIEW;
    case MediaPurpose.OTHER:
      return null;
  }
}

export function uploadPermissionsForPurpose(purpose: MediaPurpose): readonly Permission[] {
  switch (purpose) {
    case MediaPurpose.PROJECT_IMAGE:
      return [Permission.PROJECTS_CREATE, Permission.PROJECTS_UPDATE];
    case MediaPurpose.HERO_IMAGE:
      return [Permission.CONTENT_UPDATE];
    case MediaPurpose.TRANSPARENCY_DOCUMENT:
      return [Permission.TRANSPARENCY_CREATE, Permission.TRANSPARENCY_UPDATE];
    case MediaPurpose.RECEIPT:
    case MediaPurpose.OTHER:
      return [];
  }
}

export function isAdminUploadPurpose(purpose: MediaPurpose): boolean {
  return (
    purpose === MediaPurpose.PROJECT_IMAGE ||
    purpose === MediaPurpose.HERO_IMAGE ||
    purpose === MediaPurpose.TRANSPARENCY_DOCUMENT
  );
}
