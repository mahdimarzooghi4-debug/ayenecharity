import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import {
  PublishStatus,
  TransparencyDocumentType,
} from "@prisma/client";

export class TransparencyListQueryDto {
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
  @IsEnum(TransparencyDocumentType)
  type?: TransparencyDocumentType;

  @IsOptional()
  @IsEnum(PublishStatus)
  publishStatus?: PublishStatus;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsIn(["updatedAt", "documentDate", "publishedAt", "title"])
  sort: "updatedAt" | "documentDate" | "publishedAt" | "title" = "updatedAt";

  @IsOptional()
  @IsIn(["asc", "desc"])
  order: "asc" | "desc" = "desc";
}

export class CreateTransparencyDocumentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(240)
  title!: string;

  @IsEnum(TransparencyDocumentType)
  type!: TransparencyDocumentType;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  fileAssetId?: string;

  @IsOptional()
  @IsDateString()
  documentDate?: string;
}

export class UpdateTransparencyDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(240)
  title?: string;

  @IsOptional()
  @IsEnum(TransparencyDocumentType)
  type?: TransparencyDocumentType;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsOptional()
  @IsUUID()
  fileAssetId?: string | null;

  @IsOptional()
  @IsDateString()
  documentDate?: string | null;
}
