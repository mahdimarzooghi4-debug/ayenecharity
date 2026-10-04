import { Transform, Type } from "class-transformer";
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { CooperationRequestStatus } from "@prisma/client";

import {
  COOPERATION_REQUEST_TYPES,
  normalizeContactPhone,
  type CooperationRequestType,
} from "./request.domain";

function trimOptional(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export class CreateCooperationRequestDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(2, 120)
  fullName!: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  organizationOrProjectName?: string;

  @Transform(({ value }) =>
    typeof value === "string" ? normalizeContactPhone(value) : value,
  )
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/)
  phone!: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsIn(COOPERATION_REQUEST_TYPES)
  requestType!: CooperationRequestType;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(10, 3000)
  message!: string;
}

export class AdminRequestListQueryDto {
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
  @IsIn(COOPERATION_REQUEST_TYPES)
  requestType?: CooperationRequestType;

  @IsOptional()
  @IsIn(Object.values(CooperationRequestStatus))
  status?: CooperationRequestStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class UpdateCooperationRequestDto {
  @IsOptional()
  @IsIn(Object.values(CooperationRequestStatus))
  status?: CooperationRequestStatus;

  @Transform(({ value }) => {
    if (value === null) return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNote?: string | null;
}
