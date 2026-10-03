import { ProjectStatus } from "@prisma/client";

export interface PublishableProject {
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  mainImageAssetId: string | null;
}

export class ProjectPublishValidationError extends Error {
  constructor(readonly missingFields: string[]) {
    super("Project is missing required publishable fields.");
  }
}

export function normalizeProjectSlug(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("fa-IR")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function assertProjectPublishable(project: PublishableProject): void {
  const missing: string[] = [];

  if (!project.title.trim()) missing.push("title");
  if (!project.slug.trim() || project.slug.startsWith("draft-")) missing.push("slug");
  if (!project.shortDescription?.trim()) missing.push("shortDescription");
  if (!project.description?.trim()) missing.push("description");
  if (!project.mainImageAssetId) missing.push("mainImageAssetId");

  if (missing.length > 0) {
    throw new ProjectPublishValidationError(missing);
  }
}

export function resolveVisibilityForState(
  nextStatus: ProjectStatus,
  requestedVisibility: boolean | undefined,
  currentVisibility: boolean,
): boolean {
  if (nextStatus !== ProjectStatus.ACTIVE) {
    return false;
  }

  return requestedVisibility ?? currentVisibility;
}
