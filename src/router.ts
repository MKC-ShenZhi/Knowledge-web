import { createRouter, createWebHashHistory } from 'vue-router'
import { loadCurrentUser } from '@/services/auth'

const routes = [
  {
    path: '/',
    component: () => import('@/layout/Index.vue'),
    redirect: '/knowledge',
    children: [
      { path: 'knowledge', name: 'knowledge-home', component: () => import('@/views/knowledge-base/SearchHome.vue'), meta: { title: '知识底座', section: 'knowledge' } },
      { path: 'resources/papers', name: 'resource-paper', component: () => import('@/views/resource-search/Index.vue'), meta: { title: '论文检索', section: 'paper', resourceType: 'paper' } },
      { path: 'resources/patents', name: 'resource-patent', component: () => import('@/views/resource-search/Index.vue'), meta: { title: '专利检索', section: 'patent', resourceType: 'patent' } },
      { path: 'resources/scholars', name: 'resource-scholar', component: () => import('@/views/resource-search/Index.vue'), meta: { title: '学者检索', section: 'scholar', resourceType: 'scholar' } },
      { path: 'resources/project-funds', name: 'resource-projectFund', component: () => import('@/views/resource-search/Index.vue'), meta: { title: '项目基金检索', section: 'projectFund', resourceType: 'projectFund' } },
      { path: 'resources/projects', redirect: (to: any) => ({ name: 'resource-projectFund', query: to.query }) },
      { path: 'resources/funds', redirect: (to: any) => ({ name: 'resource-projectFund', query: to.query }) },
      { path: 'knowledge/conferences', name: 'conference-explorer', component: () => import('@/pages/paper-cool/VenueAll.vue'), meta: { title: '按会议探索', section: 'conference' } },
      { path: 'knowledge/conferences/:venue', name: 'conference-detail', component: () => import('@/pages/paper-cool/track.vue'), meta: { title: '会议层级', section: 'conference' } },
      { path: 'knowledge/conferences/:venue/:year/:track', name: 'conference-papers', component: () => import('@/pages/paper-cool/detail.vue'), meta: { title: '会议论文', section: 'conference' } },
      { path: 'knowledge/papers', name: 'paper-explorer', redirect: (to: any) => ({ name: 'resource-paper', query: to.query }) },
      { path: 'knowledge/papers/:paperId/graph', name: 'paper-graph', component: () => import('@/views/knowledge-graph/Index.vue'), meta: { title: '论文关系图谱', section: 'graph', fullHeight: true } },
      { path: 'kg', name: 'kg', component: () => import('@/views/knowledge-graph/Index.vue'), meta: { title: '论文关系图谱', section: 'graph', fullHeight: true } },
      { path: 'kg/topics', name: 'topic-graph', component: () => import('@/views/knowledge-graph/Topic.vue'), meta: { title: 'Topic 中心图谱', section: 'topic-graph', fullHeight: true } },
      { path: 'admin', name: 'admin', component: () => import('@/pages/Admin.vue'), meta: { title: '内容管理', section: 'admin', requiresAuth: true, requiresAdmin: true } },
      { path: 'paper-cool', redirect: '/knowledge/conferences' },
      { path: 'paper-cool/:venue', redirect: (to: any) => `/knowledge/conferences/${encodeURIComponent(String(to.params.venue))}` },
      { path: 'paper-cool/:venue/:year/:track', redirect: (to: any) => ({ name: 'conference-papers', params: to.params, query: to.query }) },
    ],
  },
  { path: '/login', name: 'login', component: () => import('@/views/login/Index.vue') },
  { path: '/register', name: 'register', component: () => import('@/pages/Register.vue') },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFound.vue') },
]

const router = createRouter({ history: createWebHashHistory(), routes })
router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    const user = await loadCurrentUser().catch(() => null)
    if (!user) return { path: '/login', query: { redirect: to.fullPath } }
    if (to.meta.requiresAdmin && user.role !== 'admin') return { path: '/knowledge' }
  }
})
export default router
