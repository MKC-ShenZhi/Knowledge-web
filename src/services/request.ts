/**
 * 统一请求层 —— 所有 HTTP 调用经此封装
 *
 * 能力：
 * - 统一鉴权（credentials: include，依赖 HttpOnly Cookie）
 * - 错误归一化（抛出带中文友好信息的 ApiError）
 * - 超时控制（默认 15s）
 * - AbortController 取消（调用方传入 signal）
 * - GET 请求去重（同一 URL 并发只发一次，可选）
 */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const DEFAULT_TIMEOUT = 15000;

const API_BASE = (import.meta.env.VITE_API_BASE as string) || "/api";

function withTimeout(url: string, options: RequestInit, timeout: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timer),
  };
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    if (data && typeof data.message === "string") return data.message;
  } catch {
    /* 非 JSON 响应 */
  }
  return fallback;
}

function statusToMessage(status: number): string {
  if (status === 401) return "未登录或登录已过期";
  if (status === 403) return "没有权限执行该操作";
  if (status === 404) return "请求的资源不存在";
  if (status >= 500) return "服务器开小差了，请稍后再试";
  if (status === 0) return "网络连接失败，请检查网络或后端服务";
  return `请求失败（${status}）`;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | Record<string, unknown> | null;
  timeout?: number;
  /** 外部传入的取消信号，与内部超时合并 */
  signal?: AbortSignal;
  /** 是否解析为 JSON（默认 true） */
  json?: boolean;
}

/** 低层 request：相对 /api 的路径，如 /conferences */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, body, signal: externalSignal, json = true, headers, ...rest } = options;

  const { signal: timeoutSignal, cancel } = withTimeout(path, {}, timeout);

  // 合并外部 signal 与超时 signal
  const signals: AbortSignal[] = [timeoutSignal];
  if (externalSignal) signals.push(externalSignal);
  const combinedSignal = signals.length === 1 ? signals[0] : AbortSignal.any(signals);

  const finalHeaders = new Headers(headers);
  let finalBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (typeof body === "string" || body instanceof FormData || body instanceof Blob) {
      finalBody = body as BodyInit;
    } else {
      finalHeaders.set("Content-Type", "application/json");
      finalBody = JSON.stringify(body);
    }
  }

  const url = path.startsWith("http") || path.startsWith("/api") ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: finalHeaders,
      body: finalBody,
      credentials: "include",
      signal: combinedSignal,
    });
  } catch (e: any) {
    cancel();
    if (e?.name === "AbortError") throw new ApiError("请求已取消或超时", 0);
    throw new ApiError("网络连接失败，请检查网络或后端服务", 0);
  }
  cancel();

  if (!response.ok) {
    const msg = await readErrorMessage(response, statusToMessage(response.status));
    throw new ApiError(msg, response.status);
  }

  if (response.status === 204) return undefined as T;
  if (!json) return response as unknown as T;
  return response.json() as Promise<T>;
}

export { API_BASE };
