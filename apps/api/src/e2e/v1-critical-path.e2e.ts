import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import {
  ValidationPipe,
  type INestApplication,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  AdminRole,
  AdminUserStatus,
  PrismaClient,
} from "@prisma/client";
import { hash } from "bcryptjs";

import { AppModule } from "../app.module";
import { PASSWORD_HASH_ROUNDS } from "../auth/auth.constants";
import {
  configuredWebOrigins,
  createAdminCsrfMiddleware,
  createSecurityHeadersMiddleware,
} from "../security/security.middleware";

const prisma = new PrismaClient();
const password = "E2E-Secure-Password#2026";

let app: INestApplication;
let baseUrl = "";
let s3Server: Server;
let s3BaseUrl = "";

interface LoginSession {
  cookie: string;
}

interface JsonResponse<T = Record<string, unknown>> {
  response: Response;
  body: T;
}

function jsonHeaders(cookie?: string): Record<string, string> {
  return {
    accept: "application/json",
    "content-type": "application/json",
    origin: "http://localhost:3000",
    ...(cookie ? { cookie } : {}),
  };
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<JsonResponse<T>> {
  const response = await fetch(baseUrl + path, init);
  const text = await response.text();
  const body = text ? (JSON.parse(text) as T) : ({} as T);
  return { response, body };
}

async function login(email: string): Promise<LoginSession> {
  const { response } = await requestJson("/api/admin/auth/login", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password }),
  });

  assert.equal(response.status, 200);
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "login must set the admin session cookie");

  return {
    cookie: setCookie.split(";")[0]!,
  };
}

async function adminJson<T>(
  session: LoginSession,
  path: string,
  init: RequestInit = {},
): Promise<JsonResponse<T>> {
  return requestJson<T>(path, {
    ...init,
    headers: {
      ...jsonHeaders(session.cookie),
      ...(init.headers ?? {}),
    },
  });
}

async function adminUpload(
  session: LoginSession,
  purpose: string,
  fileName: string,
  mimeType: string,
  bytes: Uint8Array,
): Promise<Record<string, unknown>> {
  const form = new FormData();
  form.set("purpose", purpose);
  form.set("file", new Blob([bytes], { type: mimeType }), fileName);

  const response = await fetch(baseUrl + "/api/admin/media", {
    method: "POST",
    headers: {
      accept: "application/json",
      origin: "http://localhost:3000",
      cookie: session.cookie,
    },
    body: form,
  });

  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(response.status, 201, JSON.stringify(body));
  return body;
}

async function submitContribution(
  projectId: string,
  name: string,
): Promise<Record<string, unknown>> {
  const form = new FormData();
  form.set("projectId", projectId);
  form.set("contributorName", name);
  form.set("contributorPhone", "09123456789");
  form.set("amountRial", "1000000");
  form.set("contributorNote", "E2E contribution");
  form.set(
    "receipt",
    new Blob([new TextEncoder().encode("%PDF-1.4 E2E receipt")], {
      type: "application/pdf",
    }),
    "receipt.pdf",
  );

  const response = await fetch(baseUrl + "/api/contributions", {
    method: "POST",
    headers: { accept: "application/json" },
    body: form,
  });

  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(response.status, 201, JSON.stringify(body));
  return body;
}

async function resetDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.adminSession.deleteMany(),
    prisma.contribution.deleteMany(),
    prisma.transparencyDocument.deleteMany(),
    prisma.heroSlide.deleteMany(),
    prisma.siteContent.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.cooperationRequest.deleteMany(),
    prisma.project.deleteMany(),
    prisma.mediaAsset.deleteMany(),
    prisma.adminUser.deleteMany(),
  ]);
}

async function seedAdmins(): Promise<void> {
  const passwordHash = await hash(password, PASSWORD_HASH_ROUNDS);

  await prisma.adminUser.createMany({
    data: [
      {
        email: "e2e-super@ayene.invalid",
        passwordHash,
        fullName: "E2E Super",
        role: AdminRole.SUPER_ADMIN,
        status: AdminUserStatus.ACTIVE,
      },
      {
        email: "e2e-finance@ayene.invalid",
        passwordHash,
        fullName: "E2E Finance",
        role: AdminRole.FINANCE,
        status: AdminUserStatus.ACTIVE,
      },
      {
        email: "e2e-project@ayene.invalid",
        passwordHash,
        fullName: "E2E Project",
        role: AdminRole.PROJECT_MANAGER,
        status: AdminUserStatus.ACTIVE,
      },
      {
        email: "e2e-content@ayene.invalid",
        passwordHash,
        fullName: "E2E Content",
        role: AdminRole.CONTENT_MANAGER,
        status: AdminUserStatus.ACTIVE,
      },
    ],
  });
}

before(async () => {
  await resetDatabase();
  await seedAdmins();

  s3Server = createServer((request, response) => {
    if (request.method === "HEAD") {
      response.statusCode = 200;
      response.end();
      return;
    }

    if (request.method === "PUT") {
      request.resume();
      request.on("end", () => {
        response.statusCode = 200;
        response.setHeader("etag", '"e2e-etag"');
        response.end();
      });
      return;
    }

    if (request.method === "DELETE") {
      request.resume();
      request.on("end", () => {
        response.statusCode = 204;
        response.end();
      });
      return;
    }

    if (request.method === "GET") {
      response.statusCode = 200;
      response.setHeader("content-type", "application/octet-stream");
      response.end("E2E object");
      return;
    }

    response.statusCode = 404;
    response.end();
  });

  await new Promise<void>((resolve) => {
    s3Server.listen(0, "127.0.0.1", resolve);
  });

  const s3Address = s3Server.address() as AddressInfo;
  s3BaseUrl = `http://127.0.0.1:${s3Address.port}`;

  process.env.NODE_ENV = "test";
  process.env.SESSION_SECRET =
    "e2e-session-secret-that-is-longer-than-thirty-two-characters";
  process.env.WEB_ORIGIN = "http://localhost:3000";
  process.env.S3_ENDPOINT = s3BaseUrl;
  process.env.S3_REGION = "us-east-1";
  process.env.S3_BUCKET = "ayene-e2e";
  process.env.S3_ACCESS_KEY_ID = "e2e-access";
  process.env.S3_SECRET_ACCESS_KEY = "e2e-secret";
  process.env.S3_FORCE_PATH_STYLE = "true";
  process.env.PUBLIC_MEDIA_BASE_URL = s3BaseUrl + "/ayene-e2e";

  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: configuredWebOrigins(),
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Accept"],
  });
  app.use(createSecurityHeadersMiddleware(false));
  app.use(
    createAdminCsrfMiddleware(configuredWebOrigins(), false),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  await app.listen(0, "127.0.0.1");
  const address = app.getHttpServer().address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await app?.close();
  await prisma.$disconnect();
  await new Promise<void>((resolve, reject) => {
    s3Server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

test("V1 critical paths work end to end against PostgreSQL and HTTP", async () => {
  const superAdmin = await login("e2e-super@ayene.invalid");
  const finance = await login("e2e-finance@ayene.invalid");
  const projectManager = await login("e2e-project@ayene.invalid");
  const contentManager = await login("e2e-content@ayene.invalid");

  const projectImage = await adminUpload(
    projectManager,
    "PROJECT_IMAGE",
    "project.png",
    "image/png",
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
  );

  const createdProject = await adminJson<{
    id: string;
    slug: string;
    status: string;
  }>(projectManager, "/api/admin/projects", {
    method: "POST",
    body: JSON.stringify({
      title: "طرح تست نهایی",
      slug: "e2e-final-project",
      shortDescription: "توضیح کوتاه واقعی برای تست نهایی",
      description:
        "توضیح کامل طرح برای اعتبارسنجی مسیر انتشار و مرور عمومی.",
      mainImageAssetId: projectImage.id,
      displayOrder: 1,
    }),
  });

  assert.equal(createdProject.response.status, 201);
  assert.equal(createdProject.body.status, "DRAFT");

  const publishedProject = await adminJson<{
    status: string;
    visibility: boolean;
  }>(
    projectManager,
    "/api/admin/projects/" + createdProject.body.id + "/state",
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "ACTIVE",
        visibility: true,
      }),
    },
  );

  assert.equal(publishedProject.response.status, 200);
  assert.equal(publishedProject.body.status, "ACTIVE");
  assert.equal(publishedProject.body.visibility, true);

  const publicProjects = await requestJson<{
    items: Array<{ id: string; slug: string }>;
  }>("/api/public/projects");

  assert.equal(publicProjects.response.status, 200);
  assert.ok(
    publicProjects.body.items.some(
      (item) => item.id === createdProject.body.id,
    ),
  );

  const publicProject = await requestJson<{
    project: { id: string; slug: string };
  }>("/api/public/projects/e2e-final-project");

  assert.equal(publicProject.response.status, 200);
  assert.equal(publicProject.body.project.id, createdProject.body.id);

  const contributionA = await submitContribution(
    createdProject.body.id,
    "مشارکت کننده اول",
  );
  assert.equal(contributionA.status, "PENDING");
  assert.equal(contributionA.version, 1);

  const reviewApprove = await adminJson<{ status: string; version: number }>(
    finance,
    "/api/admin/contributions/" + contributionA.id + "/review",
    {
      method: "PATCH",
      body: JSON.stringify({
        decision: "APPROVE",
        version: 1,
      }),
    },
  );

  assert.equal(reviewApprove.response.status, 200);
  assert.equal(reviewApprove.body.status, "APPROVED");
  assert.equal(reviewApprove.body.version, 2);

  const staleReview = await adminJson(
    finance,
    "/api/admin/contributions/" + contributionA.id + "/review",
    {
      method: "PATCH",
      body: JSON.stringify({
        decision: "REJECT",
        version: 1,
        rejectionReason: "stale update",
      }),
    },
  );
  assert.equal(staleReview.response.status, 409);

  const contributionB = await submitContribution(
    createdProject.body.id,
    "مشارکت کننده دوم",
  );

  const reviewReject = await adminJson<{ status: string }>(
    finance,
    "/api/admin/contributions/" + contributionB.id + "/review",
    {
      method: "PATCH",
      body: JSON.stringify({
        decision: "REJECT",
        version: 1,
        rejectionReason: "رسید قابل تأیید نیست",
      }),
    },
  );

  assert.equal(reviewReject.response.status, 200);
  assert.equal(reviewReject.body.status, "REJECTED");

  const transparencyFile = await adminUpload(
    finance,
    "TRANSPARENCY_DOCUMENT",
    "report.pdf",
    "application/pdf",
    new TextEncoder().encode("%PDF-1.4 E2E transparency"),
  );

  const createdDocument = await adminJson<{
    id: string;
    publishStatus: string;
  }>(finance, "/api/admin/transparency", {
    method: "POST",
    body: JSON.stringify({
      title: "گزارش تست نهایی",
      type: "PERFORMANCE_REPORT",
      description: "گزارش تست مسیر انتشار",
      projectId: createdProject.body.id,
      fileAssetId: transparencyFile.id,
      documentDate: "2026-10-04T00:00:00.000Z",
    }),
  });

  assert.equal(createdDocument.response.status, 201);
  assert.equal(createdDocument.body.publishStatus, "DRAFT");

  const publishedDocument = await adminJson<{
    publishStatus: string;
  }>(
    finance,
    "/api/admin/transparency/" + createdDocument.body.id + "/publish",
    { method: "PATCH" },
  );

  assert.equal(publishedDocument.response.status, 200);
  assert.equal(publishedDocument.body.publishStatus, "PUBLISHED");

  const publicTransparency = await requestJson<{
    categories: Array<{
      documents: Array<{ id: string; title: string }>;
    }>;
  }>("/api/public/transparency");

  assert.equal(publicTransparency.response.status, 200);
  assert.ok(
    publicTransparency.body.categories.some((category) =>
      category.documents.some(
        (document) => document.id === createdDocument.body.id,
      ),
    ),
  );

  const cooperation = await requestJson<{
    id: string;
    status: string;
  }>("/api/cooperation-requests", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      fullName: "درخواست کننده تست",
      organizationOrProjectName: "مجموعه تست",
      phone: "09120000000",
      email: "cooperation@ayene.invalid",
      requestType: "PROJECT_PROPOSAL",
      message: "این یک درخواست همکاری معتبر برای تست مسیر نهایی است.",
    }),
  });

  assert.equal(cooperation.response.status, 201);
  assert.equal(cooperation.body.status, "NEW");

  const cooperationReview = await adminJson<{ status: string }>(
    contentManager,
    "/api/admin/requests/" + cooperation.body.id,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "IN_REVIEW",
        internalNote: "پیگیری داخلی تست نهایی",
      }),
    },
  );

  assert.equal(cooperationReview.response.status, 200);
  assert.equal(cooperationReview.body.status, "IN_REVIEW");

  const centerSettings = await adminJson<{
    center: { phone: string };
  }>(superAdmin, "/api/admin/settings/center", {
    method: "PATCH",
    body: JSON.stringify({
      name: "مرکز نیکوکاری آینه",
      parentOrganization: "خانه خلاق آینه",
      address: "نشانی تست E2E",
      phone: "02100000000",
      email: "contact@ayene.invalid",
    }),
  });

  assert.equal(centerSettings.response.status, 200);
  assert.equal(centerSettings.body.center.phone, "02100000000");

  const contentUpdate = await adminJson<{ value: string }>(
    contentManager,
    "/api/admin/content/blocks/home.hero.title",
    {
      method: "PATCH",
      body: JSON.stringify({
        value: "عنوان تست نهایی صفحه اصلی",
      }),
    },
  );

  assert.equal(contentUpdate.response.status, 200);
  assert.equal(
    contentUpdate.body.value,
    "عنوان تست نهایی صفحه اصلی",
  );

  const publicHome = await requestJson<{
    content: { heroTitle: string };
    settings: Record<string, unknown>;
  }>("/api/public/home");

  assert.equal(publicHome.response.status, 200);
  assert.equal(
    publicHome.body.content.heroTitle,
    "عنوان تست نهایی صفحه اصلی",
  );

  const financeProjectCreate = await adminJson(
    finance,
    "/api/admin/projects",
    {
      method: "POST",
      body: JSON.stringify({ title: "غیرمجاز" }),
    },
  );
  assert.equal(financeProjectCreate.response.status, 403);

  const projectManagerContributionReview = await adminJson(
    projectManager,
    "/api/admin/contributions/" + contributionB.id + "/review",
    {
      method: "PATCH",
      body: JSON.stringify({
        decision: "APPROVE",
        version: 2,
      }),
    },
  );
  assert.equal(projectManagerContributionReview.response.status, 403);

  const contentSettings = await adminJson(
    contentManager,
    "/api/admin/settings",
  );
  assert.equal(contentSettings.response.status, 403);

  const auditActions = await prisma.auditLog.findMany({
    select: { action: true },
  });
  const actions = new Set(auditActions.map((item) => item.action));

  for (const required of [
    "AUTH_LOGIN_SUCCESS",
    "PROJECT_STATE_CHANGED",
    "CONTRIBUTION_APPROVED",
    "CONTRIBUTION_REJECTED",
    "TRANSPARENCY_DOCUMENT_PUBLISHED",
    "COOPERATION_REQUEST_STATUS_CHANGED",
    "SETTINGS_UPDATED",
    "SITE_CONTENT_UPDATED",
  ]) {
    assert.ok(actions.has(required), "missing audit action " + required);
  }
});
