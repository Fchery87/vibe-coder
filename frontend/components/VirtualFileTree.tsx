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
  Gauge,
  GitBranch,
} from "lucide-react";

interface FileNode {
  id: string;
  name: string;
  path?: string;
  children?: FileNode[];
  type: "file" | "folder";
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

export default function VirtualFileTree({
  files,
  onFileSelect,
  onContextAction,
}: VirtualFileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [activePath, setActivePath] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [contextMenuItem, setContextMenuItem] = useState<FlattenedNode | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const flattenedItems = useMemo(() => {
    const flattened: FlattenedNode[] = [];

    const flatten = (nodes: FileNode[], level: number) => {
      nodes.forEach((node) => {
        const isExpanded = expandedFolders.has(node.id);
        flattened.push({ ...node, level, isExpanded });

        if (node.type === "folder" && node.children && isExpanded) {
          flatten(node.children, level + 1);
        }
      });
    };

    flatten(files, 0);
    return flattened;
  }, [files, expandedFolders]);

  const virtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 5,
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
    if (item.type === "folder") {
      toggleFolder(item.id);
    } else if (item.path) {
      setActivePath(item.path);
      onFileSelect?.(item.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: FlattenedNode) => {
    if (item.type === "file") {
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
      nodes.forEach((node) => {
        if (node.type === "folder") {
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
      <div className="flex items-center justify-between">
        <div className="leading-tight">
          <h3 className="font-semibold" style={{ fontSize: "var(--size-h2)" }}>
            Project Files
          </h3>
          <p className="text-[var(--size-small)] text-[var(--muted)]">
            {flattenedItems.length} items
          </p>
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

      <div ref={parentRef} className="flex-1 overflow-auto pr-1" style={{ contain: "strict" }}>
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
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
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
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
                      {item.type === "folder" ? (
                        item.isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                        )
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-[var(--muted)] flex-shrink-0" />
                      )}
                      <span className={`truncate ${isActive ? "text-[var(--accent-2)]" : ""}`}>
                        {item.name}
                      </span>
                    </div>

                    {item.type === "file" && (
                      <div className="flex items-center gap-[var(--gap-2)] text-[var(--muted)]">
                        <Sparkles className="w-3 h-3" />
                        <Wrench className="w-3 h-3" />
                        <TestTube className="w-3 h-3" />
                        <Gauge className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showContextMenu && contextMenuItem && (
        <div
          className="fixed z-50 w-48 rounded-md border border-slate-700 bg-slate-900/95 p-1 shadow-lg backdrop-blur-sm"
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          role="menu"
          onMouseLeave={() => setShowContextMenu(false)}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            onClick={() => handleContextAction("open")}
          >
            <Folder className="w-3.5 h-3.5" />
            Open in new tab
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            onClick={() => handleContextAction("compare")}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Compare changes
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            onClick={() => handleContextAction("open-explorer")}
          >
            <Folder className="w-3.5 h-3.5" />
            Open in Explorer
          </button>
        </div>
      )}
    </div>
  );
}
