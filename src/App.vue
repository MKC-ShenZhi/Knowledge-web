<template>
  <router-view v-slot="{ Component, route }">
    <keep-alive>
      <component :is="Component" v-if="route.meta.keepAlive" :key="route.fullPath" />
    </keep-alive>
    <component :is="Component" v-if="!route.meta.keepAlive" :key="route.fullPath" />
  </router-view>
</template>

<script setup lang="ts">
// 全局错误兜底：捕获未处理的 Promise 异常与组件渲染异常，避免白屏
import { onErrorCaptured } from 'vue'

onErrorCaptured((err) => {
  console.error('[App] 未捕获的组件异常:', err)
  return false
})
</script>
