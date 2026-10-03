import assert from "node:assert/strict";
import test from "node:test";
import { ProjectStatus } from "@prisma/client";

import {
  assertProjectPublishable,
  normalizeProjectSlug,
  ProjectPublishValidationError,
  resolveVisibilityForState,
} from "./projects.domain";

test("slug normalization keeps unicode letters and creates stable hyphens", () => {
  assert.equal(normalizeProjectSlug("  طرح  ماه_۱۴۰۵  "), "طرح-ماه-۱۴۰۵");
});

test("draft placeholder slug is not publishable", () => {
  assert.throws(
    () =>
      assertProjectPublishable({
        title: "ماه",
        slug: "draft-12345678",
        shortDescription: "توضیح کوتاه",
        description: "توضیح کامل",
        mainImageAssetId: "asset",
      }),
    (error: unknown) =>
      error instanceof ProjectPublishValidationError && error.missingFields.includes("slug"),
  );
});

test("active publication requires all public content", () => {
  assert.throws(
    () =>
      assertProjectPublishable({
        title: "ماه",
        slug: "mah",
        shortDescription: null,
        description: "",
        mainImageAssetId: null,
      }),
    ProjectPublishValidationError,
  );
});

test("non-active states always become hidden", () => {
  assert.equal(resolveVisibilityForState(ProjectStatus.INACTIVE, true, true), false);
  assert.equal(resolveVisibilityForState(ProjectStatus.ARCHIVED, undefined, true), false);
  assert.equal(resolveVisibilityForState(ProjectStatus.ACTIVE, undefined, true), true);
});
