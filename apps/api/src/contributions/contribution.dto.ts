import { Transform } from "class-transformer";
import {
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from "class-validator";

import {
  normalizeIranianMobile,
  normalizeRialAmountInput,
} from "./contribution.domain";

export class CreateContributionDto {
  @IsUUID()
  projectId!: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(2, 120)
  contributorName!: string;

  @Transform(({ value }) =>
    typeof value === "string" ? normalizeIranianMobile(value) : value,
  )
  @IsString()
  @Matches(/^09\d{9}$/)
  contributorPhone!: string;

  @Transform(({ value }) =>
    typeof value === "string" ? normalizeRialAmountInput(value) : value,
  )
  @IsString()
  @Matches(/^[0-9]+$/)
  amountRial!: string;

  @Transform(({ value }) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  contributorNote?: string;
}
