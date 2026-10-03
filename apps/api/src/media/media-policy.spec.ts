import assert from "node:assert/strict";
import test from "node:test";

import { MediaPurpose, MediaVisibility } from "@prisma/client";

import {
  accessPermissionForPurpose,
  extensionForMimeType,
  isAdminUploadPurpose,
  MediaPolicyError,
  validateMediaUpload,
} from "./media-policy";
import { Permission } from "../auth/permissions";

test("project and hero images are public image-only assets", () => {
  const project = validateMediaUpload(MediaPurpose.PROJECT_IMAGE, "image/webp", 1024);
  const hero = validateMediaUpload(MediaPurpose.HERO_IMAGE, "image/jpeg", 1024);

  assert.equal(project.visibility, MediaVisibility.PUBLIC);
  assert.equal(hero.visibility, MediaVisibility.PUBLIC);
  assert.throws(
    () => validateMediaUpload(MediaPurpose.HERO_IMAGE, "application/pdf", 1024),
    MediaPolicyError,
  );
});

test("receipts remain private and permit image or PDF formats", () => {
  const receipt = validateMediaUpload(MediaPurpose.RECEIPT, "application/pdf", 1024);

  assert.equal(receipt.visibility, MediaVisibility.PRIVATE);
  assert.equal(accessPermissionForPurpose(MediaPurpose.RECEIPT), Permission.CONTRIBUTIONS_VIEW);
  assert.equal(isAdminUploadPurpose(MediaPurpose.RECEIPT), false);
});

test("purpose-specific size limits are enforced", () => {
  assert.throws(
    () => validateMediaUpload(MediaPurpose.RECEIPT, "image/jpeg", 6 * 1024 * 1024),
    MediaPolicyError,
  );
  assert.doesNotThrow(() =>
    validateMediaUpload(
      MediaPurpose.TRANSPARENCY_DOCUMENT,
      "application/pdf",
      10 * 1024 * 1024,
    ),
  );
});

test("known MIME types map to deterministic extensions", () => {
  assert.equal(extensionForMimeType("image/jpeg"), "jpg");
  assert.equal(extensionForMimeType("application/pdf"), "pdf");
  assert.throws(() => extensionForMimeType("application/octet-stream"), MediaPolicyError);
});
