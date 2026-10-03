import { Controller, Get } from "@nestjs/common";

import { AdminProtected } from "../auth/admin-protected.decorator";
import { DashboardService } from "./dashboard.service";

@Controller("admin/dashboard")
@AdminProtected()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboard() {
    return this.dashboardService.getDashboard();
  }
}
