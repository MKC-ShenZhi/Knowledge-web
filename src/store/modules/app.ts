import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * 应用级 store。
 *
 * 清理说明：原 sidebarCollapsed / toggleSidebar / darkMode / toggleDarkMode
 * 在移除全局侧边栏后已无 UI 引用（死代码），已删除。
 * darkMode 待真正实现换肤时再加回。
 */
export const useAppStore = defineStore("app", () => {
  const title = ref("CCF DDL");
  return { title };
});
