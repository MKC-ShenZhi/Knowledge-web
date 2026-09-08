# 深知 · 知识库 Web（shenzhi-knowledge-base-v1）

**此代码为知识底座组构建的初步前端。**
面向"深知"知识库的 Web 前端项目，基于 Vue 3 + TypeScript + Vite 构建，提供统一检索、论文探索、知识图谱与资源检索等能力。

## 技术栈

- Vue 3 + TypeScript + Vite
- Pinia（状态管理）
- Vue Router（路由）
- Element Plus（UI 组件库）
- relation-graph（知识图谱可视化）

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
    复制 .env.example 为 .env，并按需填写
    注意：.env 等真实配置文件已被 .gitignore 忽略，不会提交到仓库

# 3. 启动开发服务器
npm run dev

# 4. 构建生产产物
npm run build

# 5. 本地预览构建产物
npm run preview
```

## 环境变量

环境变量通过 `.env` / `.env.development.local` 等文件提供，字段说明请参考 `.env.example`。

## 相关文档

- [API 使用指南](API_USAGE_GUIDE.md)
- 部署可参考 `nginx.retrieval.location.conf.example`

## 目录结构

```
public/            # 静态资源（含 kg-data 知识图谱数据）
src/
  components/      # 通用组件
  composables/     # 组合式函数
  config/          # 配置
  layout/          # 整体布局
  pages/           # 页面级组件
  services/        # API / 请求封装
  store/           # Pinia 状态
  styles/          # 样式（tokens.css）
  types/           # TypeScript 类型定义
  utils/           # 工具函数
  views/           # 路由视图
```
