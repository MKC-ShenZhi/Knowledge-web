<template>
  <div class="related-list">
    <button
      v-if="centerPaper"
      type="button"
      class="origin-card"
      :class="{ active: selectedId === centerPaper.paper_id }"
      @click="$emit('select', centerPaper.paper_id)"
    >
      <span class="origin-label">Origin paper</span>
      <strong>{{ centerPaper.title }}</strong>
      <span class="paper-meta">{{ formatAuthors(centerPaper.authors) }} · {{ centerPaper.year || '年份未知' }}</span>
    </button>

    <div v-if="papers.length" class="list-heading">
      <span>相关论文</span>
      <span>{{ papers.length }}</span>
    </div>

    <div v-if="papers.length" class="paper-items">
      <button
        v-for="paper in papers"
        :key="paper.paper_id"
        type="button"
        class="paper-item"
        :class="{ active: selectedId === paper.paper_id }"
        @click="$emit('select', paper.paper_id)"
      >
        <span class="direction-badge" :class="paper.relationDirection">
          {{ directionLabel(paper.relationDirection) }}
        </span>
        <strong>{{ paper.title }}</strong>
        <span class="paper-meta">
          {{ formatAuthors(paper.authors) }} · {{ paper.year || '年份未知' }}
        </span>
        <span v-if="paper.venue || paper.citationCount" class="paper-foot">
          <span>{{ paper.venue || '出版信息未知' }}</span>
          <span v-if="paper.citationCount">{{ paper.citationCount }} 次引用</span>
        </span>
      </button>
    </div>

    <div v-else-if="centerPaper" class="empty-list">
      <span class="empty-icon">○</span>
      <strong>暂无符合条件的相关论文</strong>
      <p>可以切换上方关系方向，或重新搜索另一篇论文。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PaperDetail, RelatedPaperDirection, RelatedPaperItem } from '@/types/kg'

defineProps<{
  centerPaper: PaperDetail | null
  papers: RelatedPaperItem[]
  selectedId: string | null
}>()

defineEmits<{
  select: [paperId: string]
}>()

function formatAuthors(authors: string[]): string {
  if (!authors?.length) return '作者未知'
  if (authors.length <= 2) return authors.join(', ')
  return `${authors.slice(0, 2).join(', ')} 等`
}

function directionLabel(direction: RelatedPaperDirection): string {
  if (direction === 'reference') return '参考文献'
  if (direction === 'citation') return '引用本文'
  return '双向关联'
}
</script>

<style scoped>
.related-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

button {
  font: inherit;
}

.origin-card,
.paper-item {
  width: 100%;
  border: 0;
  text-align: left;
  cursor: pointer;
  color: #0f1419;
  transition: background-color 0.16s ease, border-color 0.16s ease;
}

.origin-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border-left: 3px solid #002fa7;
  border-radius: 12px;
  background: #f9fafb;
}

.origin-card:hover,
.origin-card.active {
  background: #e9eefb;
}

.origin-label {
  color: #002fa7;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.origin-card strong,
.paper-item strong {
  display: block;
  font-size: 13px;
  line-height: 1.45;
}

.paper-meta {
  color: #9ca3af;
  font-size: 11px;
  line-height: 1.4;
}

.list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 4px 0;
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
}

.paper-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.paper-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 11px 12px;
  border-radius: 10px;
  background: transparent;
}

.paper-item:hover {
  background: #f9fafb;
}

.paper-item.active {
  background: #e9eefb;
}

.paper-item.active strong {
  color: #002fa7;
}

.direction-badge {
  align-self: flex-start;
  padding: 2px 7px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 10px;
  font-weight: 600;
}

.direction-badge.citation {
  background: #e9eefb;
  color: #002fa7;
}

.direction-badge.both {
  background: #ede9fe;
  color: #5b21b6;
}

.paper-foot {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: #6b7280;
  font-size: 10px;
}

.empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px;
  color: #9ca3af;
  text-align: center;
}

.empty-icon {
  margin-bottom: 8px;
  color: #002fa7;
  font-size: 30px;
}

.empty-list strong {
  color: #374151;
  font-size: 13px;
}

.empty-list p {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.6;
}
</style>
