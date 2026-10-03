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
} from "@nestjs/common";

import { AdminProtected } from "../auth/admin-protected.decorator";
import type { AdminHttpRequest } from "../auth/auth.types";
import { Permission } from "../auth/permissions";
import {
  ChangeProjectStateDto,
  CreateProjectDto,
  ProjectListQueryDto,
  UpdateProjectDto,
} from "./project.dto";
import { ProjectsService } from "./projects.service";

@Controller("admin/projects")
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @AdminProtected(Permission.PROJECTS_VIEW)
  list(@Query() query: ProjectListQueryDto) {
    return this.projectsService.list(query);
  }

  @Get(":id")
  @AdminProtected(Permission.PROJECTS_VIEW)
  get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.projectsService.getById(id);
  }

  @Post()
  @AdminProtected(Permission.PROJECTS_CREATE)
  create(@Body() dto: CreateProjectDto, @Req() request: AdminHttpRequest) {
    return this.projectsService.create(dto, request.adminUser!);
  }

  @Patch(":id")
  @AdminProtected(Permission.PROJECTS_UPDATE)
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProjectDto,
    @Req() request: AdminHttpRequest,
  ) {
    return this.projectsService.update(id, dto, request.adminUser!);
  }

  @Patch(":id/state")
  @AdminProtected(Permission.PROJECTS_STATUS)
  changeState(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: ChangeProjectStateDto,
    @Req() request: AdminHttpRequest,
  ) {
    return this.projectsService.changeState(id, dto, request.adminUser!);
  }
}
