import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from "@nestjs/common";

import { AdminProtected } from "./admin-protected.decorator";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_COOKIE_PATH } from "./auth.constants";
import { LoginDto } from "./auth.dto";
import { AuthService } from "./auth.service";
import type { AdminHttpRequest, CookieResponse, RequestContext } from "./auth.types";
import { readCookie } from "./session-token";

@Controller("admin/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() request: AdminHttpRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<{ user: NonNullable<AdminHttpRequest["adminUser"]> }> {
    const result = await this.authService.login(dto, this.requestContext(request));

    response.cookie(ADMIN_SESSION_COOKIE, result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: ADMIN_SESSION_COOKIE_PATH,
      maxAge: this.authService.getSessionTtlMs(),
    });

    return { user: result.user };
  }

  @Post("logout")
  @AdminProtected()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: AdminHttpRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<void> {
    const sessionToken = readCookie(request.headers.cookie, ADMIN_SESSION_COOKIE);
    await this.authService.logout(sessionToken, this.requestContext(request));

    response.clearCookie(ADMIN_SESSION_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: ADMIN_SESSION_COOKIE_PATH,
    });
  }

  @Get("me")
  @AdminProtected()
  me(@Req() request: AdminHttpRequest): { user: NonNullable<AdminHttpRequest["adminUser"]> } {
    return { user: request.adminUser! };
  }

  private requestContext(request: AdminHttpRequest): RequestContext {
    return {
      ipAddress: request.ip ?? request.socket?.remoteAddress,
      userAgent: request.headers["user-agent"],
    };
  }
}
