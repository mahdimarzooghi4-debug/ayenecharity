import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
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

const INTERNAL_TARGET_PATTERN = /^\/(?!\/)[^\s]*$/;

function optionalTrim(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export class CreateHeroSlideDto {
  @IsUUID()
  imageAssetId!: string;

  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title!: string;

  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description!: string;

  @Transform(({ value }) => optionalTrim(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  ctaLabel?: string;

  @Transform(({ value }) => optionalTrim(value))
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(INTERNAL_TARGET_PATTERN)
  ctaTarget?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateHeroSlideDto {
  @IsOptional()
  @IsUUID()
  imageAssetId?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description?: string;

  @Transform(({ value }) => optionalTrim(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  ctaLabel?: string | null;

  @Transform(({ value }) => optionalTrim(value))
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(INTERNAL_TARGET_PATTERN)
  ctaTarget?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ReorderHeroSlidesDto {
  @IsArray()
  @IsUUID("4", { each: true })
  ids!: string[];
}

export class UpdateContentBlockDto {
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  value!: string;
}
