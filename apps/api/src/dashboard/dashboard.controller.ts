import { Controller, Get, Req } from "@nestjs/common";

import { AdminProtected } from "../auth/admin-protected.decorator";
import type { AdminHttpRequest } from "../auth/auth.types";
import { DashboardService } from "./dashboard.service";

@Controller("admin/dashboard")
@AdminProtected()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboard(@Req() request: AdminHttpRequest) {
    return this.dashboardService.getDashboard(request.adminUser!);
  }
}
