import { Transform } from "class-transformer";
import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

function trim(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class UpdateCenterSettingsDto {
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  parentOrganization!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(500)
  address!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(40)
  phone!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(254)
  @ValidateIf(
    (object: UpdateCenterSettingsDto) =>
      typeof object.email === "string" && object.email.length > 0,
  )
  @IsEmail()
  email!: string;
}

export class UpdateContributionSettingsDto {
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(40)
  cardNumber!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(160)
  accountHolderName!: string;
}

export class UpdateSocialSettingsDto {
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(500)
  instagram!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(500)
  bale!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(500)
  telegram!: string;
}
