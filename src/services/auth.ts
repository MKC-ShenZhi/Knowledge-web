import { ref } from "vue";
import { request, ApiError } from "./request";

const API_BASE = (import.meta.env.VITE_API_BASE as string) || "/api";

export interface AuthUser {
  id: number;
  username: string;
  role: string;
}

/** 当前登录用户（全局唯一数据源，auth store 与路由守卫均依赖此 ref） */
export const currentUser = ref<AuthUser | null>(null);

let userLoaded = false;

export async function loadCurrentUser(force = false): Promise<AuthUser | null> {
  if (userLoaded && !force) return currentUser.value;

  try {
    const data = await request<{ user: AuthUser }>("/auth/me");
    currentUser.value = data.user;
    return data.user;
  } catch (e) {
    // 401 属正常「未登录」态，不抛错只清空 user
    if (e instanceof ApiError && e.status === 401) {
      currentUser.value = null;
      return null;
    }
    currentUser.value = null;
    throw e;
  } finally {
    userLoaded = true;
  }
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const data = await request<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: { username, password },
  });
  currentUser.value = data.user;
  userLoaded = true;
  return data.user;
}

export async function register(username: string, password: string): Promise<AuthUser> {
  const data = await request<{ user: AuthUser }>("/auth/register", {
    method: "POST",
    body: { username, password },
  });
  currentUser.value = data.user;
  userLoaded = true;
  return data.user;
}

export async function logout(): Promise<void> {
  try {
    await request("/auth/logout", { method: "POST" });
  } catch {
    /* 即使后端登出失败也清空本地态 */
  }
  currentUser.value = null;
  userLoaded = true;
}

// 兼容旧引用（如有）
export { API_BASE };
