<template>
  <main class="app-main">
    <router-view />
  </main>
</template>
<style scoped>
.app-main {
  flex: 1;
  height: 0;
  min-width: 0;
  min-height: 0;
  padding: 24px 28px 32px;
  background: var(--sz-bg);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}
@media (max-width: 900px) { .app-main { padding: 18px 16px 24px; } }
</style>
