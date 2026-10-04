const webBase = process.env.STAGING_WEB_URL?.replace(/\/+$/, "");
const apiBase = process.env.STAGING_API_URL?.replace(/\/+$/, "");

if (!webBase || !apiBase) {
  throw new Error(
    "STAGING_WEB_URL and STAGING_API_URL are required for staging smoke tests.",
  );
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    return await fetch(url, {
      ...init,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "ayene-v1-release-smoke/1.0",
        ...(init.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function expectStatus(url, expected = 200) {
  const response = await fetchWithTimeout(url);
  if (response.status !== expected) {
    throw new Error(
      `Smoke check failed for ${url}: expected ${expected}, got ${response.status}`,
    );
  }
  return response;
}

const live = await expectStatus(apiBase + "/api/health/live");
const liveBody = await live.json();
if (liveBody.status !== "ok") {
  throw new Error("API liveness payload is not ok.");
}

const ready = await expectStatus(apiBase + "/api/health/ready");
const readyBody = await ready.json();
if (
  readyBody.status !== "ok" ||
  readyBody.dependencies?.database?.status !== "ok" ||
  readyBody.dependencies?.objectStorage?.status !== "ok"
) {
  throw new Error("API readiness dependencies are not healthy.");
}

for (const path of [
  "/",
  "/projects",
  "/transparency",
  "/services",
  "/about",
  "/contact",
  "/robots.txt",
  "/sitemap.xml",
]) {
  await expectStatus(webBase + path);
}

const unauthorized = await fetchWithTimeout(
  apiBase + "/api/admin/auth/me",
  { headers: { accept: "application/json" } },
);
if (unauthorized.status !== 401) {
  throw new Error(
    `Unauthenticated admin check expected 401, got ${unauthorized.status}`,
  );
}

const publicResponse = await expectStatus(apiBase + "/api/public/home");
for (const [name, value] of [
  ["x-content-type-options", "nosniff"],
  ["x-frame-options", "DENY"],
]) {
  if (publicResponse.headers.get(name) !== value) {
    throw new Error(
      `Security header ${name} is missing or unexpected.`,
    );
  }
}

const adminPage = await expectStatus(webBase + "/admin");
const adminHtml = (await adminPage.text()).toLowerCase();
if (!adminHtml.includes("noindex")) {
  throw new Error("Admin page does not expose a noindex directive.");
}

process.stdout.write(
  JSON.stringify({
    status: "ok",
    check: "staging-smoke",
    webBase,
    apiBase,
  }) + "\n",
);
