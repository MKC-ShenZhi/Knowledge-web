<template>
  <div class="directory-tree">
    <div class="tree-container">
      <el-tree
        ref="treeRef"
        :data="directoryData"
        :props="treeProps"
        :default-expand-all="false"
        :expand-on-click-node="false"
        node-key="id"
        class="directory-tree-component"
        :lazy="true"
        :load="handleLoadNodeChildren"
        @node-click="handleNodeClick"
      >
        <template #default="{ node, data }">
          <div class="tree-node" :class="`level-${data.level}`">
            <span class="node-icon">
              <el-icon>
                <Folder v-if="!node.expanded" />
                <FolderOpened v-else />
              </el-icon>
            </span>
            <span class="node-label" :title="getNodePathString(data)">
              {{ data.name }}
            </span>
          </div>
        </template>
      </el-tree>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElTree, ElButton, ElIcon } from 'element-plus'
import { Folder, FolderOpened } from '@element-plus/icons-vue'
import { DirectoryNode, parseDirectoryStructure, getNodePathString, loadNodeChildren } from '../utils/directoryStructure'

// Props
interface Props {
  csvData: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits(['nodeClick'])

// 响应式状态
const treeRef = ref()
const isAllExpanded = ref(false)

// 解析目录数据（使用缓存避免重复计算）
// 使用模块级变量确保缓存持久化（即使组件重新创建也保持缓存）
let cachedCsvData = ''
let cachedDirectoryData: DirectoryNode[] = []
let parseCount = 0 // 用于调试，记录解析次数

const directoryData = computed(() => {
  // 如果传入的 CSV 数据为空或只有表头
  const isPropsEmpty = !props.csvData || props.csvData.trim() === '' || props.csvData.trim() === '层级1,层级2,层级3'
  
  // 如果传入数据为空，但有缓存的有效数据，使用缓存（组件重新创建时的临时状态）
  if (isPropsEmpty) {
    if (cachedDirectoryData.length > 0 && cachedCsvData && 
        cachedCsvData.trim() !== '' && 
        cachedCsvData.trim() !== '层级1,层级2,层级3') {
      // 有有效缓存，返回缓存数据（等待正确的数据传入）
      return cachedDirectoryData
    }
    // 没有有效缓存，返回空数组
    if (cachedCsvData !== (props.csvData || '')) {
      cachedCsvData = props.csvData || ''
      cachedDirectoryData = []
    }
    return []
  }
  
  // 如果传入的 CSV 数据与缓存相同，直接返回缓存（避免重复解析）
  if (props.csvData === cachedCsvData) {
    return cachedDirectoryData
  }
  
  // 传入的数据与缓存不同，需要重新解析
  cachedCsvData = props.csvData
  parseCount++
  try {
    cachedDirectoryData = parseDirectoryStructure(props.csvData)
    // 调试信息：如果解析后为空，可能是数据格式问题
    if (cachedDirectoryData.length === 0 && props.csvData.trim().split('\n').length > 1) {
      console.warn('目录数据解析后为空，但CSV有数据行，可能是格式问题。解析次数:', parseCount)
    } else {
      // 成功解析时输出调试信息（仅在开发环境）
      if (import.meta.env.DEV) {
        console.log(`目录数据解析成功，共 ${cachedDirectoryData.length} 个一级目录。解析次数: ${parseCount}`)
      }
    }
  } catch (error) {
    console.error('解析目录结构失败:', error)
    cachedDirectoryData = []
  }
  return cachedDirectoryData
})

// 树形组件配置
// Element Plus 期望 isLeaf: (data: TreeNodeData, node: Node) => boolean
// 此处用宽松签名兼容，内部断言为 DirectoryNode
const treeProps = {
  children: 'children',
  label: 'name',
  isLeaf: (data: unknown) => {
    const d = data as DirectoryNode
    // 如果已经加载过，根据children判断
    if (d.childrenLoaded) {
      return !d.children || d.children.length === 0
    }
    // 如果未加载，根据hasChildren判断
    return !d.hasChildren
  }
}

// 处理节点点击
const handleNodeClick = (data: DirectoryNode) => {
  emit('nodeClick', data)
}

// 懒加载：加载节点的子节点
const handleLoadNodeChildren = (node: any, resolve: (children: DirectoryNode[]) => void) => {
  const directoryNode = node.data as DirectoryNode
  
  // 如果已经加载过，直接返回
  if (directoryNode.childrenLoaded) {
    resolve(directoryNode.children || [])
    return
  }
  
  // 如果没有子节点，返回空数组
  if (!directoryNode.hasChildren) {
    resolve([])
    return
  }
  
  // 动态加载子节点
  const children = loadNodeChildren(directoryNode)
  directoryNode.children = children
  directoryNode.childrenLoaded = true
  
  // 延迟一下，让用户看到加载过程
  setTimeout(() => {
    resolve(children)
  }, 50)
}

// 展开/收起所有节点
const expandAll = () => {
  if (isAllExpanded.value) {
    treeRef.value?.collapseAll()
    isAllExpanded.value = false
  } else {
    treeRef.value?.expandAll()
    isAllExpanded.value = true
  }
}

// 生命周期
onMounted(async () => {
  // 等待DOM更新完成
  await nextTick()
  // 懒加载模式下，默认不展开任何节点，让用户按需展开
  // 这样可以避免一次性加载所有数据
})
</script>

<style scoped>
.directory-tree {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 0 4px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-title .el-icon {
  font-size: 22px;
  color: #64748b;
}

.expand-btn {
  font-size: 17px;
  color: #64748b;
  padding: 3px 6px;
}

.expand-btn:hover {
  color: #2563eb;
  background-color: rgba(37, 99, 235, 0.1);
}

.tree-container {
  flex: 1;
  overflow: auto;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(226, 232, 240, 0.6);
}

.directory-tree-component {
  background: transparent;
  padding: 6px;
}

:deep(.el-tree-node__content) {
  height: 28px;
  border-radius: 4px;
  margin: 1px 0;
  transition: all 0.3s ease;
}

:deep(.el-tree-node__content:hover) {
  background-color: rgba(37, 99, 235, 0.1);
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background-color: rgba(37, 99, 235, 0.15);
  color: #2563eb;
  font-weight: 500;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  font-size: 18px;
  color: #475569;
}

.node-icon {
  display: flex;
  align-items: center;
  color: #94a3b8;
  font-size: 19px;
}

.tree-node.level-1 .node-icon {
  color: #2563eb;
}

.tree-node.level-2 .node-icon {
  color: #7c3aed;
}

.tree-node.level-3 .node-icon {
  color: #059669;
}

.node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

:deep(.el-tree-node__expand-icon) {
  color: #94a3b8;
  font-size: 16px;
}

:deep(.el-tree-node__expand-icon.expanded) {
  transform: rotate(90deg);
}

:deep(.el-tree-node__children) {
  padding-left: 12px;
}

/* 自定义滚动条 */
.tree-container::-webkit-scrollbar {
  width: 4px;
}

.tree-container::-webkit-scrollbar-track {
  background: rgba(226, 232, 240, 0.3);
  border-radius: 2px;
}

.tree-container::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.5);
  border-radius: 2px;
}

.tree-container::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.7);
}
</style> 