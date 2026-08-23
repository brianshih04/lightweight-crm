const MAX_PAGES_PER_LOAD = 20;

export interface ApiIssue {
  path: string;
  message: string;
  code: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;
  readonly issues: readonly ApiIssue[];

  constructor(args: {
    status: number;
    code: string;
    message: string;
    requestId?: string | null;
    issues?: readonly ApiIssue[];
  }) {
    super(args.message);
    this.name = "ApiError";
    this.status = args.status;
    this.code = args.code;
    this.requestId = args.requestId ?? null;
    this.issues = args.issues ?? [];
  }
}

export function parseApiErrorEnvelope(payload: unknown, status: number): ApiError | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.error !== "string" && typeof record.code !== "string") return null;

  const rawIssues = Array.isArray(record.issues) ? record.issues : [];
  const issues: ApiIssue[] = [];
  for (const item of rawIssues) {
    if (typeof item !== "object" || item === null) continue;
    const issue = item as Record<string, unknown>;
    if (typeof issue.message !== "string") continue;
    issues.push({
      path: typeof issue.path === "string" ? issue.path : "",
      message: issue.message,
      code: typeof issue.code === "string" ? issue.code : "",
    });
  }

  return new ApiError({
    status,
    code: typeof record.code === "string" ? record.code : `HTTP_${status}`,
    message:
      typeof record.error === "string" && record.error
        ? record.error
        : `請求失敗 (${status})`,
    requestId: typeof record.requestId === "string" ? record.requestId : null,
    issues,
  });
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.issues.length > 0) {
      return error.issues.map((issue) => issue.message).join("；");
    }
    return error.message || "請求失敗，請稍後再試";
  }
  return "無法連線伺服器，請檢查網路後重試";
}

function redirectToLoginIfSessionExpired(error: ApiError) {
  if (error.status !== 401 || error.code !== "UNAUTHENTICATED") return;
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  window.location.href = "/login";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const payload: unknown = await response.json();
    const parsed = parseApiErrorEnvelope(payload, response.status);
    if (parsed) return parsed;
  } catch {
    // fall through to generic error below
  }
  return new ApiError({
    status: response.status,
    code: `HTTP_${response.status}`,
    message: `請求失敗 (${response.status})`,
  });
}

export async function fetchApiResponse(path: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "無法連線伺服器，請檢查網路後重試",
    });
  }

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    redirectToLoginIfSessionExpired(error);
    throw error;
  }
  return response;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchApiResponse(path, init);
  return response.json() as Promise<T>;
}

export async function fetchAllPages<T>(path: string, init?: RequestInit): Promise<T[]> {
  const items: T[] = [];
  const url = new URL(path, window.location.origin);
  if (!url.searchParams.has("limit")) url.searchParams.set("limit", "100");

  for (let page = 0; page < MAX_PAGES_PER_LOAD; page += 1) {
    const response = await fetchApiResponse(url.toString(), init);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new ApiError({
      status: response.status,
      code: "INVALID_RESPONSE",
      message: "API 回應格式非預期的陣列",
    });
    items.push(...data as T[]);

    const nextCursor = response.headers.get("x-next-cursor");
    if (!nextCursor) return items;
    url.searchParams.set("cursor", nextCursor);
  }

  throw new ApiError({
    status: 0,
    code: "PAGINATION_LIMIT",
    message: `資料量超過單次載入上限（${MAX_PAGES_PER_LOAD * 100} 筆），請縮小範圍後重試`,
  });
}
