import { cn } from "@/lib/utils"
import { useFilesStore } from "@/stores/files"
import { File, Folder } from "lucide-react"

export function FileTree() {
  const { files, selectedFile, selectFile } = useFilesStore()
  const fileList = Array.from(files.keys()).sort()

  // Group files by directory
  const tree = buildTree(fileList)

  return (
    <div className="py-2 text-sm">
      <TreeNode node={tree} selectedFile={selectedFile} onSelect={selectFile} />
    </div>
  )
}

interface TreeNodeData {
  name: string
  path: string
  isDir: boolean
  children: TreeNodeData[]
}

function buildTree(paths: string[]): TreeNodeData {
  const root: TreeNodeData = { name: "", path: "", isDir: true, children: [] }

  for (const path of paths) {
    const parts = path.split("/")
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const currentPath = parts.slice(0, i + 1).join("/")

      let child = current.children.find((c) => c.name === part)
      if (!child) {
        child = {
          name: part,
          path: currentPath,
          isDir: !isLast,
          children: [],
        }
        current.children.push(child)
      }
      current = child
    }
  }

  // Sort: directories first, then alphabetically
  const sortChildren = (node: TreeNodeData) => {
    node.children.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    node.children.forEach(sortChildren)
  }
  sortChildren(root)

  return root
}

function TreeNode({
  node,
  selectedFile,
  onSelect,
  depth = 0,
}: {
  node: TreeNodeData
  selectedFile: string | null
  onSelect: (path: string | null) => void
  depth?: number
}) {
  if (node.path === "") {
    // Root node, just render children
    return (
      <>
        {node.children.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            selectedFile={selectedFile}
            onSelect={onSelect}
            depth={depth}
          />
        ))}
      </>
    )
  }

  const isSelected = selectedFile === node.path
  const Icon = node.isDir ? Folder : File

  return (
    <div>
      <button
        onClick={() => !node.isDir && onSelect(node.path)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1 hover:bg-secondary text-left",
          isSelected && "bg-secondary text-foreground",
          !isSelected && "text-muted-foreground"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <Icon size={14} className="flex-shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
      {node.isDir &&
        node.children.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            selectedFile={selectedFile}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))}
    </div>
  )
}
