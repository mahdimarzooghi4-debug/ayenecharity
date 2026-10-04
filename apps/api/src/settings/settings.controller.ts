import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
} from "@nestjs/common";

import { AdminProtected } from "../auth/admin-protected.decorator";
import type { AdminHttpRequest, RequestContext } from "../auth/auth.types";
import { Permission } from "../auth/permissions";
import {
  UpdateCenterSettingsDto,
  UpdateContributionSettingsDto,
  UpdateSocialSettingsDto,
} from "./settings.dto";
import { SettingsService } from "./settings.service";

@Controller("admin/settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @AdminProtected(Permission.SETTINGS_VIEW)
  get() {
    return this.settingsService.getAdminSettings();
  }

  @Patch("center")
  @AdminProtected(Permission.SETTINGS_UPDATE)
  updateCenter(
    @Body() dto: UpdateCenterSettingsDto,
    @Req() request: AdminHttpRequest,
  ) {
    return this.settingsService.updateCenter(
      dto,
      request.adminUser!,
      this.requestContext(request),
    );
  }

  @Patch("contribution")
  @AdminProtected(Permission.SETTINGS_UPDATE)
  updateContribution(
    @Body() dto: UpdateContributionSettingsDto,
    @Req() request: AdminHttpRequest,
  ) {
    return this.settingsService.updateContribution(
      dto,
      request.adminUser!,
      this.requestContext(request),
    );
  }

  @Patch("social")
  @AdminProtected(Permission.SETTINGS_UPDATE)
  updateSocial(
    @Body() dto: UpdateSocialSettingsDto,
    @Req() request: AdminHttpRequest,
  ) {
    return this.settingsService.updateSocial(
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
