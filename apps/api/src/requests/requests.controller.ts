import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { AdminProtected } from "../auth/admin-protected.decorator";
import type { AdminHttpRequest, RequestContext } from "../auth/auth.types";
import { Permission } from "../auth/permissions";
import {
  AdminRequestListQueryDto,
  CreateCooperationRequestDto,
  UpdateCooperationRequestDto,
} from "./request.dto";
import { RequestRateLimitGuard } from "./request-rate-limit.guard";
import { RequestsService } from "./requests.service";

@Controller("cooperation-requests")
export class PublicRequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @UseGuards(RequestRateLimitGuard)
  submit(@Body() dto: CreateCooperationRequestDto) {
    return this.requestsService.submit(dto);
  }
}

@Controller("admin/requests")
export class AdminRequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get()
  @AdminProtected(Permission.REQUESTS_VIEW)
  list(@Query() query: AdminRequestListQueryDto) {
    return this.requestsService.list(query);
  }

  @Get(":id")
  @AdminProtected(Permission.REQUESTS_VIEW)
  get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.requestsService.getAdminById(id);
  }

  @Patch(":id")
  @AdminProtected(Permission.REQUESTS_VIEW)
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCooperationRequestDto,
    @Req() request: AdminHttpRequest,
  ) {
    return this.requestsService.update(
      id,
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
