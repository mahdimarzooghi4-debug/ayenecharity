import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
} from "@nestjs/common";

import { AdminProtected } from "../auth/admin-protected.decorator";
import type { AdminHttpRequest, RequestContext } from "../auth/auth.types";
import { Permission } from "../auth/permissions";
import {
  CreateHeroSlideDto,
  ReorderHeroSlidesDto,
  UpdateContentBlockDto,
  UpdateHeroSlideDto,
} from "./content.dto";
import { ContentService } from "./content.service";

@Controller("admin/content")
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  @AdminProtected(Permission.CONTENT_VIEW)
  get(@Req() request: AdminHttpRequest) {
    return this.contentService.getAdminContent(request.adminUser!);
  }

  @Post("hero-slides")
  @AdminProtected(Permission.CONTENT_UPDATE)
  createHero(
    @Body() dto: CreateHeroSlideDto,
    @Req() request: AdminHttpRequest,
  ) {
    return this.contentService.createHeroSlide(
      dto,
      request.adminUser!,
      this.requestContext(request),
    );
  }

  @Patch("hero-slides/:id")
  @AdminProtected(Permission.CONTENT_UPDATE)
  updateHero(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateHeroSlideDto,
    @Req() request: AdminHttpRequest,
  ) {
    return this.contentService.updateHeroSlide(
      id,
      dto,
      request.adminUser!,
      this.requestContext(request),
    );
  }

  @Put("hero-slides/reorder/all")
  @AdminProtected(Permission.CONTENT_UPDATE)
  reorderHero(
    @Body() dto: ReorderHeroSlidesDto,
    @Req() request: AdminHttpRequest,
  ) {
    return this.contentService.reorderHeroSlides(
      dto,
      request.adminUser!,
      this.requestContext(request),
    );
  }

  @Delete("hero-slides/:id")
  @AdminProtected(Permission.CONTENT_UPDATE)
  removeHero(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AdminHttpRequest,
  ) {
    return this.contentService.deleteHeroSlide(
      id,
      request.adminUser!,
      this.requestContext(request),
    );
  }

  @Patch("blocks/:key")
  @AdminProtected(Permission.CONTENT_UPDATE)
  updateBlock(
    @Param("key") key: string,
    @Body() dto: UpdateContentBlockDto,
    @Req() request: AdminHttpRequest,
  ) {
    return this.contentService.updateContentBlock(
      key,
      dto,
      request.adminUser!,
      this.requestContext(request),
    );
  }

  private requestContext(request: AdminHttpRequest): RequestContext {
    const userAgent = request.headers["user-agent"];

    return {
      ipAddress: request.ip ?? request.socket?.remoteAddress,
      userAgent:
        typeof userAgent === "string"
          ? userAgent
          : Array.isArray(userAgent)
            ? userAgent[0]
            : undefined,
    };
  }
}
