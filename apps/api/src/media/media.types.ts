import type { MediaPurpose, MediaVisibility } from "@prisma/client";

export interface UploadedMemoryFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface StoredMediaResponse {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  purpose: MediaPurpose;
  visibility: MediaVisibility;
  publicUrl: string | null;
}

export interface MediaAccessResponse {
  url: string;
  expiresInSeconds: number | null;
}
