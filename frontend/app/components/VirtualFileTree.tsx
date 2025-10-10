"use client";

import { useState, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  Sparkles,
  Wrench,
  TestTube,
  Gauge
} from "lucide-react";

interface FileNode {
  id: string;
  name: string;
  path?: string;
  children?: FileNode[];
  type: 'file' | 'folder';
}

interface VirtualFileTreeProps {
  files: FileNode[];
  onFileSelect?: (filePath: string) => void;
  onContextAction?: (action: string, filename: string) => void;
}

interface FlattenedNode extends FileNode {
  level: number;
  isExpanded?: boolean;
}

export default function VirtualFileTree({ files, onFileSelect, onContextAction }: VirtualFileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [activePath, setActivePath] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [contextMenuItem, setContextMenuItem] = useState<FlattenedNode | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Flatten tree structure for virtual scrolling
  const flattenedItems = useMemo(() => {
    const flattened: FlattenedNode[] = [];

    const flatten = (nodes: FileNode[], level: number) => {
      nodes.forEach((node) => {
        const isExpanded = expandedFolders.has(node.id);
        flattened.push({ ...node, level, isExpanded });

        if (node.type === 'folder' && node.children && isExpanded) {
          flatten(node.children, level + 1);
        }
      });
    };

    flatten(files, 0);
    return flattened;
  }, [files, expandedFolders]);

  // Virtual scrolling
  const virtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // Height of each row
    overscan: 5, // Render 5 extra items above/below viewport
  });

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleItemClick = (item: FlattenedNode) => {
    if (item.type === 'folder') {
      toggleFolder(item.id);
    } else if (item.path) {
      setActivePath(item.path);
      onFileSelect?.(item.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: FlattenedNode) => {
    if (item.type === 'file') {
      e.preventDefault();
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setContextMenuItem(item);
      setShowContextMenu(true);
    }
  };

  const handleContextAction = (action: string) => {
    if (contextMenuItem) {
      onContextAction?.(action, contextMenuItem.name);
      setShowContextMenu(false);
    }
  };

  const expandAll = () => {
    const allFolderIds = new Set<string>();
    const collectFolders = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'folder') {
          allFolderIds.add(node.id);
          if (node.children) collectFolders(node.children);
        }
      });
    };
    collectFolders(files);
    setExpandedFolders(allFolderIds);
  };

  const collapseAll = () => {
    setExpandedFolders(new Set());
  };

  return (
    <div className="panel h-full p-4 flex flex-col gap-[var(--gap-4)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="leading-tight">
          <h3 className="font-semibold" style={{ fontSize: 'var(--size-h2)' }}>Project Files</h3>
          <p className="text-[var(--size-small)] text-[var(--muted)]">{flattenedItems.length} items</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="btn text-xs"
            type="button"
            title="Expand all"
          >
            Expand
          </button>
          <button
            onClick={collapseAll}
            className="btn text-xs"
            type="button"
            title="Collapse all"
          >
            Collapse
          </button>
        </div>
      </div>

      <div className="divider" />

      {/* Virtual Scrolling Container */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto pr-1"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = flattenedItems[virtualItem.index];
            const isActive = item.path === activePath;
            const paddingLeft = item.level * 16;

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div className="file-row">
                  <div className="bar"></div>
                  <button
                    type="button"
                    className="col-span-2 flex items-center justify-between gap-[var(--gap-3)] text-left w-full py-1.5 px-2 rounded hover:bg-slate-700/30 transition-colors"
                    style={{ paddingLeft: `${paddingLeft + 8}px` }}
                    onClick={() => handleItemClick(item)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                  >
                    <div className="flex items-center gap-[var(--gap-2)] min-w-0 flex-1">
                      {item.type === 'folder' ? (
                        item.isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                        )
                      ) : (
                        <div className="w-3.5 h-3.5 flex-shrink-0"></div>
                      )}
                      {item.type === 'folder' ? (
                        <Folder className="w-4 h-4 flex-shrink-0 text-purple-400" />
                      ) : (
                        <FileText className="w-4 h-4 flex-shrink-0 text-blue-400" />
                      )}
                      <span
                        className="truncate text-[var(--size-small)]"
                        style={{ color: isActive ? 'var(--text)' : 'var(--muted)' }}
                      >
                        {item.name}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && contextMenuItem && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowContextMenu(false)}
          />
          <div
            className="fixed z-50 panel p-2 min-w-[220px] shadow-panel"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          >
            <div className="text-[var(--size-small)] text-[var(--muted)] mb-2">
              {contextMenuItem.name}
            </div>
            <div className="flex flex-col gap-[var(--gap-2)]">
              <ContextAction
                icon={<Sparkles className="w-3.5 h-3.5" />}
                label="Explain"
                onClick={() => handleContextAction('explain')}
              />
              <ContextAction
                icon={<Wrench className="w-3.5 h-3.5" />}
                label="Refactor"
                onClick={() => handleContextAction('refactor')}
              />
              <ContextAction
                icon={<TestTube className="w-3.5 h-3.5" />}
                label="Add tests"
                onClick={() => handleContextAction('add-tests')}
              />
              <ContextAction
                icon={<Gauge className="w-3.5 h-3.5" />}
                label="Optimize"
                onClick={() => handleContextAction('optimize')}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ContextAction({
  icon,
  label,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-[var(--gap-2)] px-2 py-1.5 rounded-md text-left text-[var(--size-small)] text-[var(--text)] hover:bg-[rgba(124,58,237,0.12)] transition-colors"
    >
      <span className="text-[var(--muted)]">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// Helper function to generate large file tree for testing
export function generateLargeFileTree(numFiles: number = 1000): FileNode[] {
  const folders = ['src', 'components', 'utils', 'hooks', 'pages', 'api', 'lib', 'styles'];
  const extensions = ['.tsx', '.ts', '.js', '.css', '.json', '.md'];

  const tree: FileNode[] = [];

  folders.forEach((folderName, folderIndex) => {
    const filesPerFolder = Math.floor(numFiles / folders.length);
    const children: FileNode[] = [];

    for (let i = 0; i < filesPerFolder; i++) {
      const ext = extensions[i % extensions.length];
      children.push({
        id: `file-${folderIndex}-${i}`,
        name: `File${i}${ext}`,
        path: `${folderName}/File${i}${ext}`,
        type: 'file',
      });
    }

    tree.push({
      id: `folder-${folderIndex}`,
      name: folderName,
      type: 'folder',
      children,
    });
  });

  return tree;
}
