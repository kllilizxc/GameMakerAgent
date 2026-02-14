import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { useFilesStore } from "@/stores/files"
import { File, Folder, ChevronRight, ChevronDown } from "lucide-react"

export function FileTree() {
  const files = useFilesStore((s) => s.files)
  const selectedFile = useFilesStore((s) => s.selectedFile)
  const selectFile = useFilesStore((s) => s.selectFile)

  const tree = useMemo(() => {
    const fileList = Array.from(files.keys()).sort()
    return buildTree(fileList)
  }, [files])

  return (
    <div className="py-2 text-sm select-none">
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
  const [isOpen, setIsOpen] = useState(depth < 1) // Expand first level by default

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

  const handleClick = () => {
    if (node.isDir) {
      setIsOpen(!isOpen)
    } else {
      onSelect(node.path)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          "group w-full flex items-center gap-1.5 px-2 py-1 hover:bg-secondary text-left transition-colors",
          isSelected && "bg-secondary text-foreground",
          !isSelected && "text-muted-foreground hover:text-foreground"
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {node.isDir && (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          )}
        </span>
        <Icon size={14} className={cn(
          "flex-shrink-0",
          node.isDir ? "text-blue-400" : "text-muted-foreground"
        )} />
        <span className="truncate">{node.name}</span>
      </button>

      {node.isDir && isOpen && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              selectedFile={selectedFile}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
