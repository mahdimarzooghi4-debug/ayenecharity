import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
} from "@nestjs/common";

import { AdminProtected } from "../auth/admin-protected.decorator";
import type { AdminHttpRequest, RequestContext } from "../auth/auth.types";
import { Permission } from "../auth/permissions";
import {
  AdminContributionListQueryDto,
  ReviewContributionDto,
} from "./admin-contribution.dto";
import { AdminContributionsService } from "./admin-contributions.service";

@Controller("admin/contributions")
export class AdminContributionsController {
  constructor(
    private readonly contributionsService: AdminContributionsService,
  ) {}

  @Get()
  @AdminProtected(Permission.CONTRIBUTIONS_VIEW)
  list(
    @Query() query: AdminContributionListQueryDto,
    @Req() request: AdminHttpRequest,
  ) {
    return this.contributionsService.list(query, request.adminUser!);
  }

  @Get(":id/receipt-url")
  @AdminProtected(Permission.CONTRIBUTIONS_VIEW)
  receiptUrl(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AdminHttpRequest,
  ) {
    return this.contributionsService.getReceiptAccessUrl(
      id,
      request.adminUser!,
    );
  }

  @Patch(":id/review")
  @AdminProtected(Permission.CONTRIBUTIONS_REVIEW)
  review(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: ReviewContributionDto,
    @Req() request: AdminHttpRequest,
  ) {
    return this.contributionsService.review(
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
