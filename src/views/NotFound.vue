<template>
  <div class="not-found">
    <div class="nf-content">
      <div class="nf-code">404</div>
      <div class="nf-desc">页面走丢了，换个地址试试。</div>
      <el-button type="primary" @click="$router.replace('/home')">返回首页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElButton } from 'element-plus'
</script>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f5f5f5;
}
.nf-content {
  text-align: center;
}
.nf-code {
  font-size: 96px;
  font-weight: 700;
  color: #2c3e50;
  line-height: 1;
  margin-bottom: 12px;
}
.nf-desc {
  color: #909399;
  margin-bottom: 24px;
}
</style>
