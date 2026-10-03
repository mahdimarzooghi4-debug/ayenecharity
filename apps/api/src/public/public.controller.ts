import { Controller, Get, Param } from "@nestjs/common";

import { PublicService } from "./public.service";

@Controller("public")
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get("home")
  home() {
    return this.publicService.getHome();
  }

  @Get("site-settings")
  siteSettings() {
    return this.publicService.getSiteSettings();
  }

  @Get("settings")
  settings() {
    return this.publicService.getPublicSettings();
  }

  @Get("projects")
  projects() {
    return this.publicService.listProjects();
  }

  @Get("projects/:slug")
  project(@Param("slug") slug: string) {
    return this.publicService.getProjectBySlug(slug);
  }
}
