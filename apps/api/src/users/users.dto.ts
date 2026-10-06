import { Transform } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import {
  AdminRole,
  AdminUserStatus,
} from "@prisma/client";

function trim(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class CreateAdminUserDto {
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[a-z0-9._-]+$/)
  username!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsEnum(AdminRole)
  role!: AdminRole;

  @IsEnum(AdminUserStatus)
  status!: AdminUserStatus;

  @IsString()
  @MinLength(12)
  @MaxLength(200)
  initialPassword!: string;
}

export class UpdateAdminUserDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[a-z0-9._-]+$/)
  username?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;
}

export class UpdateAdminUserStatusDto {
  @IsEnum(AdminUserStatus)
  status!: AdminUserStatus;
}
