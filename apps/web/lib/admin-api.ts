const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001").replace(
  /\/+$/,
  "",
);

export interface ApiErrorBody {
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.message ?? "خطایی در ارتباط با سرور رخ داد.");
  }
}

export async function adminApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(API_BASE + "/api" + path, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    let body: ApiErrorBody = {};
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = { message: "پاسخ نامعتبر از سرور دریافت شد." };
    }

    throw new AdminApiError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
