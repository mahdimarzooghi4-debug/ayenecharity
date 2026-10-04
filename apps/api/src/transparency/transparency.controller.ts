import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";

import { AdminProtected } from "../auth/admin-protected.decorator";
import type { AdminHttpRequest, RequestContext } from "../auth/auth.types";
import { Permission } from "../auth/permissions";
import {
  CreateTransparencyDocumentDto,
  TransparencyListQueryDto,
  UpdateTransparencyDocumentDto,
} from "./transparency.dto";
import { TransparencyService } from "./transparency.service";

@Controller("admin/transparency")
export class TransparencyController {
  constructor(private readonly transparencyService: TransparencyService) {}

  @Get()
  @AdminProtected(Permission.TRANSPARENCY_VIEW)
  list(
    @Query() query: TransparencyListQueryDto,
    @Req() request: AdminHttpRequest,
  ) {
    return this.transparencyService.list(query, request.adminUser!);
  }

  @Get(":id")
  @AdminProtected(Permission.TRANSPARENCY_VIEW)
  get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.transparencyService.getById(id);
  }

  @Post()
  @AdminProtected(Permission.TRANSPARENCY_CREATE)
  create(
    @Body() dto: CreateTransparencyDocumentDto,
    @Req() request: AdminHttpRequest,
  ) {
    return this.transparencyService.create(dto, request.adminUser!);
  }

  @Patch(":id")
  @AdminProtected(Permission.TRANSPARENCY_UPDATE)
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTransparencyDocumentDto,
    @Req() request: AdminHttpRequest,
  ) {
    return this.transparencyService.update(id, dto, request.adminUser!);
  }

  @Patch(":id/publish")
  @AdminProtected(Permission.TRANSPARENCY_PUBLISH)
  publish(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AdminHttpRequest,
  ) {
    return this.transparencyService.publish(
      id,
      request.adminUser!,
      this.requestContext(request),
    );
  }

  @Patch(":id/unpublish")
  @AdminProtected(Permission.TRANSPARENCY_PUBLISH)
  unpublish(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AdminHttpRequest,
  ) {
    return this.transparencyService.unpublish(
      id,
      request.adminUser!,
      this.requestContext(request),
    );
  }

  @Delete(":id")
  @AdminProtected(Permission.TRANSPARENCY_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AdminHttpRequest,
  ): Promise<void> {
    await this.transparencyService.remove(id, request.adminUser!);
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
