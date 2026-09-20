<template>
  <aside class="paper-detail">
    <div class="detail-heading">
      <span>论文详情</span>
      <span v-if="isCenter" class="origin-tag">中心论文</span>
    </div>

    <div v-if="loading && !paper" class="detail-loading">
      <span v-for="index in 7" :key="index" class="skeleton" :class="`skeleton-${index}`" />
    </div>

    <div v-else-if="error && !paper" class="detail-state">
      <strong>论文详情加载失败</strong>
      <p>{{ error }}</p>
      <button type="button" @click="$emit('retry')">重新加载</button>
    </div>

    <div v-else-if="paper" class="detail-content">
      <div v-if="loading" class="refreshing">正在更新完整信息…</div>

      <article class="bibliography">
        <h2>{{ paper.title }}</h2>
        <p class="authors">{{ authorText }}</p>
        <p class="publication">
          <span>{{ publicationText }}</span>
        </p>
      </article>

      <div class="metrics">
        <div>
          <strong>{{ paper.citationCount.toLocaleString() }}</strong>
          <span>被引用</span>
        </div>
        <div>
          <strong>{{ paper.referenceCount.toLocaleString() }}</strong>
          <span>参考文献</span>
        </div>
      </div>

      <div v-if="paper.pdf_url || paper.doi || paper.externalUrl" class="actions">
        <a v-if="paper.pdf_url" :href="paper.pdf_url" target="_blank" rel="noopener noreferrer" class="primary-link">
          查看 PDF
        </a>
        <a v-if="doiUrl" :href="doiUrl" target="_blank" rel="noopener noreferrer" class="secondary-link">
          打开 DOI
        </a>
        <a
          v-else-if="paper.externalUrl"
          :href="paper.externalUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="secondary-link"
        >
          论文主页
        </a>
      </div>

      <section class="abstract-section">
        <h3>摘要</h3>
        <p v-if="paper.abstract">{{ paper.abstract }}</p>
        <p v-else class="empty-copy">暂无摘要信息。</p>
      </section>

      <section v-if="paper.keywords.length" class="keyword-section">
        <h3>关键词</h3>
        <div class="keywords">
          <span v-for="keyword in paper.keywords" :key="keyword">{{ keyword }}</span>
        </div>
      </section>

      <section v-if="paper.doi" class="identifier-section">
        <h3>标识符</h3>
        <p>DOI：{{ paper.doi }}</p>
      </section>
    </div>

    <div v-else class="detail-state empty">
      <span class="empty-mark">⌁</span>
      <strong>选择一篇论文查看详情</strong>
      <p>从左侧论文列表或中间图谱选择节点。</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PaperDetail } from '@/types/kg'

const props = defineProps<{
  paper: PaperDetail | null
  loading: boolean
  error: string
  isCenter: boolean
}>()

defineEmits<{
  retry: []
}>()

const authorText = computed(() => {
  if (!props.paper?.authors?.length) return '作者信息暂缺'
  return props.paper.authors.join(', ')
})

const publicationText = computed(() => {
  if (!props.paper) return ''
  return [props.paper.year || '', props.paper.venue || ''].filter(Boolean).join(' · ') || '出版信息暂缺'
})

const doiUrl = computed(() => {
  const doi = props.paper?.doi?.trim()
  if (!doi) return ''
  if (/^https?:\/\//i.test(doi)) return doi
  return `https://doi.org/${doi.replace(/^doi:\s*/i, '')}`
})
</script>

<style scoped>
.paper-detail {
  display: flex;
  min-width: 0;
  height: 100%;
  flex-direction: column;
  background: #fff;
  color: #0f1419;
}

.detail-heading {
  display: flex;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
  font-weight: 700;
}

.origin-tag {
  padding: 3px 8px;
  border-radius: 999px;
  background: #e9eefb;
  color: #002fa7;
  font-size: 10px;
  font-weight: 600;
}

.detail-content {
  position: relative;
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scrollbar-width: thin;
  scrollbar-color: #e5e7eb transparent;
}

.refreshing {
  margin: -4px 0 10px;
  color: #9ca3af;
  font-size: 11px;
}

.bibliography h2 {
  margin: 0;
  color: #0f1419;
  font-size: 17px;
  font-weight: 750;
  line-height: 1.45;
}

.authors {
  margin: 12px 0 0;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.65;
}

.publication {
  margin: 8px 0 0;
  color: #9ca3af;
  font-size: 12px;
}

.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 18px;
}

.metrics div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px;
  border-radius: 10px;
  background: #f9fafb;
}

.metrics strong {
  font-size: 17px;
}

.metrics span {
  color: #9ca3af;
  font-size: 10px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.actions a,
.detail-state button {
  display: inline-flex;
  height: 32px;
  align-items: center;
  justify-content: center;
  padding: 0 13px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.16s ease, border-color 0.16s ease;
}

.primary-link,
.detail-state button {
  border: 1px solid #002fa7;
  background: #002fa7;
  color: #fff;
}

.primary-link:hover,
.detail-state button:hover {
  background: #002889;
}

.secondary-link {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #374151;
}

.secondary-link:hover {
  background: #f3f4f6;
}

.abstract-section,
.keyword-section,
.identifier-section {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid #e5e7eb;
}

section h3 {
  margin: 0 0 10px;
  color: #0f1419;
  font-size: 12px;
  font-weight: 700;
}

.abstract-section p,
.identifier-section p {
  margin: 0;
  color: #374151;
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-line;
  word-break: break-word;
}

.abstract-section .empty-copy {
  color: #9ca3af;
}

.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.keywords span {
  padding: 4px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #374151;
  font-size: 11px;
}

.detail-state,
.detail-loading {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 24px 20px;
}

.detail-state {
  align-items: center;
  justify-content: center;
  color: #6b7280;
  text-align: center;
}

.detail-state strong {
  color: #374151;
  font-size: 13px;
}

.detail-state p {
  margin: 7px 0 14px;
  font-size: 11px;
  line-height: 1.6;
}

.detail-state button {
  cursor: pointer;
}

.empty-mark {
  margin-bottom: 10px;
  color: #002fa7;
  font-size: 34px;
}

.detail-loading {
  gap: 10px;
}

.skeleton {
  height: 14px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f3f4f6 25%, #e9eefb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skeleton-1 { width: 92%; height: 22px; }
.skeleton-2 { width: 66%; }
.skeleton-3 { width: 48%; }
.skeleton-4 { width: 100%; margin-top: 20px; }
.skeleton-5 { width: 96%; }
.skeleton-6 { width: 88%; }
.skeleton-7 { width: 72%; }

@keyframes shimmer {
  to { background-position: -200% 0; }
}
</style>
