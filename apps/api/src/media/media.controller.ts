import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

import { AdminProtected } from "../auth/admin-protected.decorator";
import type { AdminHttpRequest } from "../auth/auth.types";
import { MAX_HTTP_UPLOAD_BYTES } from "./media-policy";
import { UploadMediaDto } from "./media.dto";
import { MediaService } from "./media.service";
import type {
  MediaAccessResponse,
  StoredMediaResponse,
  UploadedMemoryFile,
} from "./media.types";

@Controller("admin/media")
@AdminProtected()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        files: 1,
        fileSize: MAX_HTTP_UPLOAD_BYTES,
      },
    }),
  )
  upload(
    @Body() dto: UploadMediaDto,
    @UploadedFile() file: UploadedMemoryFile | undefined,
    @Req() request: AdminHttpRequest,
  ): Promise<StoredMediaResponse> {
    return this.mediaService.uploadForAdmin(
      dto.purpose,
      dto.projectId,
      file,
      request.adminUser!,
    );
  }

  @Get(":id/access-url")
  accessUrl(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AdminHttpRequest,
  ): Promise<MediaAccessResponse> {
    return this.mediaService.getAdminAccessUrl(id, request.adminUser!);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AdminHttpRequest,
  ): Promise<void> {
    await this.mediaService.removeUnreferencedAsset(id, request.adminUser!);
  }
}
