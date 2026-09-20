// 目录结构数据处理工具

export interface DirectoryNode {
  id: string
  name: string
  level: number
  children: DirectoryNode[]
  parent?: DirectoryNode
  path: string[]
  hasChildren?: boolean // 标记是否有子节点
  childrenLoaded?: boolean // 标记子节点是否已加载
}

export interface DirectoryData {
  level1: string
  level2: string
  level3: string
}

// 存储原始CSV数据，用于懒加载
let rawCsvData: string = ''

// 解析CSV数据并构建树形结构（懒加载模式：只解析一级目录，三级制）
export function parseDirectoryStructure(csvData: string): DirectoryNode[] {
  // 如果数据为空，返回空数组
  if (!csvData || csvData.trim() === '') {
    rawCsvData = ''
    return []
  }
  
  // 保存原始数据用于后续懒加载
  rawCsvData = csvData
  
  const lines = csvData.trim().split('\n')
  // 如果没有数据行（只有表头或空），返回空数组
  if (lines.length <= 1) {
    return []
  }
  
  const dataLines = lines.slice(1)
  const rootNodes: DirectoryNode[] = []
  const level1Set = new Set<string>()
  
  // 只解析一级目录，不解析子节点
  dataLines.forEach(line => {
    if (!line || line.trim() === '') return
    
    const values = line.split(',')
    const level1 = values[0]?.trim()
    
    if (!level1 || level1Set.has(level1)) return
    
    level1Set.add(level1)
    
    const level1Node: DirectoryNode = {
      id: level1,
      name: level1,
      level: 1,
      children: [], // 初始为空，点击展开时再加载
      path: [level1],
      hasChildren: false
    }
    
    rootNodes.push(level1Node)
  })
  
  // 检查每个一级节点是否有子节点（二级目录）
  rootNodes.forEach(node => {
    const hasChildren = dataLines.some(line => {
      if (!line || line.trim() === '') return false
      const values = line.split(',')
      return values[0]?.trim() === node.name && values[1]?.trim()
    })
    node.hasChildren = hasChildren
  })
  
  return rootNodes
}

// 懒加载：加载指定节点的子节点（三级制：一级->二级->三级）
export function loadNodeChildren(parentNode: DirectoryNode): DirectoryNode[] {
  if (!rawCsvData) return []
  
  const lines = rawCsvData.trim().split('\n')
  const dataLines = lines.slice(1)
  const children: DirectoryNode[] = []
  const childMap = new Map<string, DirectoryNode>()
  
  if (parentNode.level === 1) {
    // 加载二级目录
    dataLines.forEach(line => {
      const values = line.split(',')
      const level1 = values[0]?.trim()
      const level2 = values[1]?.trim()
      
      if (level1 === parentNode.name && level2 && !childMap.has(level2)) {
        const level2Node: DirectoryNode = {
          id: `${parentNode.name}-${level2}`,
          name: level2,
          level: 2,
          children: [],
          path: [...parentNode.path, level2],
          parent: parentNode,
          hasChildren: false
        }
        
        // 检查是否有三级目录
        const hasLevel3 = dataLines.some(l => {
          const v = l.split(',')
          return v[0]?.trim() === level1 && v[1]?.trim() === level2 && v[2]?.trim()
        })
        level2Node.hasChildren = hasLevel3
        
        children.push(level2Node)
        childMap.set(level2, level2Node)
      }
    })
  } else if (parentNode.level === 2) {
    // 加载三级目录
    const pathParts = parentNode.path
    const level1 = pathParts[0]
    const level2 = pathParts[1]
    
    dataLines.forEach(line => {
      const values = line.split(',')
      const v1 = values[0]?.trim()
      const v2 = values[1]?.trim()
      const level3 = values[2]?.trim()
      
      if (v1 === level1 && v2 === level2 && level3 && !childMap.has(level3)) {
        const level3Node: DirectoryNode = {
          id: `${parentNode.id}-${level3}`,
          name: level3,
          level: 3,
          children: [], // 三级目录没有子节点
          path: [...parentNode.path, level3],
          parent: parentNode,
          hasChildren: false // 三级是最后一级
        }
        
        children.push(level3Node)
        childMap.set(level3, level3Node)
      }
    })
  }
  // level 3 没有子节点，不处理
  
  return children
}

// 根据节点名称查找目录节点
export function findDirectoryNodeByName(nodes: DirectoryNode[], name: string): DirectoryNode | null {
  for (const node of nodes) {
    if (node.name === name) {
      return node
    }
    const found = findDirectoryNodeByName(node.children, name)
    if (found) {
      return found
    }
  }
  return null
}

// 根据路径查找目录节点
export function findDirectoryNodeByPath(nodes: DirectoryNode[], path: string[]): DirectoryNode | null {
  if (path.length === 0) return null
  
  const level1Node = nodes.find(node => node.name === path[0])
  if (!level1Node) return null
  
  if (path.length === 1) return level1Node
  
  const level2Node = level1Node.children.find(node => node.name === path[1])
  if (!level2Node) return null
  
  if (path.length === 2) return level2Node
  
  const level3Node = level2Node.children.find(node => node.name === path[2])
  return level3Node || null
}

// 获取所有目录节点的扁平列表
export function getAllDirectoryNodes(nodes: DirectoryNode[]): DirectoryNode[] {
  const result: DirectoryNode[] = []
  
  function traverse(node: DirectoryNode) {
    result.push(node)
    node.children.forEach(child => traverse(child))
  }
  
  nodes.forEach(node => traverse(node))
  return result
}

// 获取目录节点的完整路径字符串
export function getNodePathString(node: DirectoryNode): string {
  return node.path.join(' > ')
} 