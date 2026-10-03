-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'FINANCE', 'PROJECT_MANAGER', 'CONTENT_MANAGER');
CREATE TYPE "AdminUserStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "TransparencyDocumentType" AS ENUM ('PERFORMANCE_REPORT', 'LICENSE', 'FINANCIAL_DOCUMENT');
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE "CooperationRequestStatus" AS ENUM ('NEW', 'IN_REVIEW', 'RESPONDED', 'CLOSED');
CREATE TYPE "MediaVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "MediaPurpose" AS ENUM ('PROJECT_IMAGE', 'HERO_IMAGE', 'RECEIPT', 'TRANSPARENCY_DOCUMENT', 'OTHER');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "status" "AdminUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mainImageAssetId" UUID,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Contribution" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "contributorName" TEXT NOT NULL,
    "contributorPhone" TEXT NOT NULL,
    "contributorEmail" TEXT,
    "declaredAmountRial" BIGINT NOT NULL,
    "receiptAssetId" UUID NOT NULL,
    "contributorNote" TEXT,
    "status" "ContributionStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransparencyDocument" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" "TransparencyDocumentType" NOT NULL,
    "description" TEXT,
    "projectId" UUID,
    "fileAssetId" UUID,
    "documentDate" TIMESTAMPTZ(3),
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID NOT NULL,
    "updatedById" UUID,
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "TransparencyDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CooperationRequest" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "organizationOrProjectName" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "requestType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "CooperationRequestStatus" NOT NULL DEFAULT 'NEW',
    "internalNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "CooperationRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAsset" (
    "id" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "visibility" "MediaVisibility" NOT NULL,
    "purpose" "MediaPurpose" NOT NULL,
    "checksum" TEXT,
    "projectId" UUID,
    "uploadedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HeroSlide" (
    "id" UUID NOT NULL,
    "imageAssetId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ctaLabel" TEXT,
    "ctaTarget" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteContent" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Setting" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "previousValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Unique indexes
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE UNIQUE INDEX "Contribution_receiptAssetId_key" ON "Contribution"("receiptAssetId");
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");
CREATE UNIQUE INDEX "SiteContent_key_key" ON "SiteContent"("key");
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- Operational indexes
CREATE INDEX "AdminUser_status_role_idx" ON "AdminUser"("status", "role");
CREATE INDEX "Project_status_visibility_displayOrder_idx" ON "Project"("status", "visibility", "displayOrder");
CREATE INDEX "Project_publishedAt_idx" ON "Project"("publishedAt");
CREATE INDEX "Contribution_projectId_status_createdAt_idx" ON "Contribution"("projectId", "status", "createdAt");
CREATE INDEX "Contribution_status_createdAt_idx" ON "Contribution"("status", "createdAt");
CREATE INDEX "Contribution_reviewedById_idx" ON "Contribution"("reviewedById");
CREATE INDEX "TransparencyDocument_type_publishStatus_publishedAt_idx" ON "TransparencyDocument"("type", "publishStatus", "publishedAt");
CREATE INDEX "TransparencyDocument_projectId_publishStatus_idx" ON "TransparencyDocument"("projectId", "publishStatus");
CREATE INDEX "TransparencyDocument_createdById_idx" ON "TransparencyDocument"("createdById");
CREATE INDEX "CooperationRequest_status_createdAt_idx" ON "CooperationRequest"("status", "createdAt");
CREATE INDEX "CooperationRequest_phone_idx" ON "CooperationRequest"("phone");
CREATE INDEX "MediaAsset_visibility_purpose_createdAt_idx" ON "MediaAsset"("visibility", "purpose", "createdAt");
CREATE INDEX "MediaAsset_projectId_idx" ON "MediaAsset"("projectId");
CREATE INDEX "MediaAsset_uploadedById_idx" ON "MediaAsset"("uploadedById");
CREATE INDEX "HeroSlide_active_displayOrder_idx" ON "HeroSlide"("active", "displayOrder");
CREATE INDEX "HeroSlide_updatedById_idx" ON "HeroSlide"("updatedById");
CREATE INDEX "SiteContent_updatedById_idx" ON "SiteContent"("updatedById");
CREATE INDEX "Setting_isPublic_idx" ON "Setting"("isPublic");
CREATE INDEX "Setting_updatedById_idx" ON "Setting"("updatedById");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Foreign keys
ALTER TABLE "Project"
  ADD CONSTRAINT "Project_mainImageAssetId_fkey"
  FOREIGN KEY ("mainImageAssetId") REFERENCES "MediaAsset"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Contribution"
  ADD CONSTRAINT "Contribution_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Contribution"
  ADD CONSTRAINT "Contribution_receiptAssetId_fkey"
  FOREIGN KEY ("receiptAssetId") REFERENCES "MediaAsset"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Contribution"
  ADD CONSTRAINT "Contribution_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "AdminUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransparencyDocument"
  ADD CONSTRAINT "TransparencyDocument_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransparencyDocument"
  ADD CONSTRAINT "TransparencyDocument_fileAssetId_fkey"
  FOREIGN KEY ("fileAssetId") REFERENCES "MediaAsset"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransparencyDocument"
  ADD CONSTRAINT "TransparencyDocument_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TransparencyDocument"
  ADD CONSTRAINT "TransparencyDocument_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "AdminUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MediaAsset"
  ADD CONSTRAINT "MediaAsset_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MediaAsset"
  ADD CONSTRAINT "MediaAsset_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "AdminUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HeroSlide"
  ADD CONSTRAINT "HeroSlide_imageAssetId_fkey"
  FOREIGN KEY ("imageAssetId") REFERENCES "MediaAsset"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HeroSlide"
  ADD CONSTRAINT "HeroSlide_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "AdminUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SiteContent"
  ADD CONSTRAINT "SiteContent_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "AdminUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Setting"
  ADD CONSTRAINT "Setting_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "AdminUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "AdminUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
