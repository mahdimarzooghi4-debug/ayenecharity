import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { ProjectStatus } from "@prisma/client";

const SLUG_PATTERN = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(SLUG_PATTERN)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12000)
  description?: string;

  @IsOptional()
  @IsUUID()
  mainImageAssetId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  displayOrder?: number;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(SLUG_PATTERN)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12000)
  description?: string;

  @IsOptional()
  @IsUUID()
  mainImageAssetId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  displayOrder?: number;
}

export class ChangeProjectStateDto {
  @IsEnum(ProjectStatus)
  status!: ProjectStatus;

  @IsOptional()
  @IsBoolean()
  visibility?: boolean;
}

export class ProjectListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return value;
  })
  @IsBoolean()
  visibility?: boolean;

  @IsOptional()
  @IsIn(["updatedAt", "createdAt", "displayOrder", "title"])
  sort: "updatedAt" | "createdAt" | "displayOrder" | "title" = "updatedAt";

  @IsOptional()
  @IsIn(["asc", "desc"])
  order: "asc" | "desc" = "desc";
}
