import { defineStore } from "pinia";
import { computed } from "vue";
import { currentUser, loadCurrentUser, logout as serviceLogout } from "@/services/auth";

/**
 * 认证 store —— 与 services/auth.ts 的 currentUser 单一数据源同步。
 *
 * 设计要点（修复原「双轨认证」问题）：
 * - 不再使用 localStorage token。鉴权完全依赖 HttpOnly Cookie（服务端设置）+ /api/auth/me 探测。
 * - isLoggedIn 基于 user 是否存在，而非 token 字符串，避免与 Cookie 状态不一致。
 * - user 数据源唯一：services/auth.ts 的 currentUser ref，store 只是 Pinia 的访问门面。
 */
export const useAuthStore = defineStore("auth", () => {
  const user = computed(() => currentUser.value);
  const isLoggedIn = computed(() => !!currentUser.value);

  async function refresh() {
    await loadCurrentUser(true).catch(() => null);
  }

  async function logout() {
    await serviceLogout();
  }

  return { user, isLoggedIn, refresh, logout };
});
