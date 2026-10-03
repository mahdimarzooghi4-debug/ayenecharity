import { MediaPurpose } from "@prisma/client";
import { IsEnum, IsOptional, IsUUID } from "class-validator";

export class UploadMediaDto {
  @IsEnum(MediaPurpose)
  purpose!: MediaPurpose;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
