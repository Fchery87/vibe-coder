"use client";

import { useState, useRef, useEffect } from "react";
import { Tree } from "react-arborist";

const initialData = [
  { id: "1", name: "public", children: [{ id: "2", name: "index.html", path: "public/index.html" }] },
  { id: "3", name: "src", children: [{ id: "4", name: "App.js", path: "src/App.js" }] },
  { id: "5", name: "package.json", path: "package.json" },
];

interface FileTreeProps {
  onFileSelect?: (filePath: string) => void;
  onContextAction?: (action: string, filename: string) => void;
}

export default function FileTree({ onFileSelect, onContextAction }: FileTreeProps) {
  const [data, setData] = useState(initialData);
  const [allCollapsed, setAllCollapsed] = useState(true);

  const toggleAllFolders = () => {
    setAllCollapsed(!allCollapsed);
    // This will trigger a re-render and all FileTreeItem components will use the new state
  };

  return (
    <div className="h-full glass-panel rounded-lg p-4 shadow-2xl">
      {/* File Tree Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700/50">
        <h3 className="text-sm font-semibold text-white">Project Files</h3>
        <button
          onClick={toggleAllFolders}
          className="p-1 hover:bg-slate-700/50 rounded transition-colors text-gray-400 hover:text-white"
          title={allCollapsed ? "Expand All" : "Collapse All"}
        >
          {allCollapsed ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>

      <div className="space-y-1">
        {data.map((item) => (
          <FileTreeItem
            key={item.id}
            item={item}
            level={0}
            onFileSelect={onFileSelect}
            onContextAction={onContextAction}
            forceCollapsed={allCollapsed}
          />
        ))}
      </div>
    </div>
  );
}

function FileTreeItem({ item, level, onFileSelect, onContextAction, forceCollapsed }: { item: any; level: number; onFileSelect?: (filePath: string) => void; onContextAction?: (action: string, filename: string) => void; forceCollapsed?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  // Update isOpen when forceCollapsed changes
  useEffect(() => {
    if (forceCollapsed !== undefined) {
      setIsOpen(!forceCollapsed);
    }
  }, [forceCollapsed]);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const hasChildren = item.children && item.children.length > 0;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleContextAction = (action: string) => {
    if (onContextAction) {
      onContextAction(action, item.name);
    }
    setShowContextMenu(false);
  };

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  return (
    <div>
      <div
        className="flex items-center hover:bg-slate-700/50 cursor-pointer p-2 rounded-lg transition-all duration-200 hover:shadow-lg group"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          if (hasChildren) {
            setIsOpen(!isOpen);
          } else if (item.path && onFileSelect) {
            onFileSelect(item.path);
          }
        }}
        onContextMenu={handleContextMenu}
      >
        {hasChildren && (
          <span className="mr-2 text-purple-400 transition-transform duration-200 group-hover:scale-110">
            {isOpen ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </span>
        )}
        {!hasChildren && <span className="mr-2 text-blue-400">📄</span>}
        {hasChildren && <span className="mr-2 text-yellow-400">📁</span>}
        <span className="text-sm text-gray-200 group-hover:text-white transition-colors duration-200">{item.name}</span>
      </div>

      {/* Context Menu */}
      {showContextMenu && !hasChildren && (
        <div
          className="fixed z-50 glass-panel rounded-lg shadow-2xl border border-slate-600/50 py-1 min-w-48"
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
        >
          <div className="px-3 py-2 text-xs font-semibold text-gray-300 border-b border-slate-600/50">
            AI Actions for {item.name}
          </div>
          <button
            onClick={() => handleContextAction('explain')}
            className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-slate-700/50 transition-colors flex items-center gap-2"
          >
            <span>🧠</span>
            Explain Code
          </button>
          <button
            onClick={() => handleContextAction('refactor')}
            className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-slate-700/50 transition-colors flex items-center gap-2"
          >
            <span>🔄</span>
            Refactor
          </button>
          <button
            onClick={() => handleContextAction('add-tests')}
            className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-slate-700/50 transition-colors flex items-center gap-2"
          >
            <span>🧪</span>
            Add Tests
          </button>
          <button
            onClick={() => handleContextAction('optimize')}
            className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-slate-700/50 transition-colors flex items-center gap-2"
          >
            <span>⚡</span>
            Optimize
          </button>
        </div>
      )}

      {hasChildren && isOpen && (
        <div className="animate-fade-in">
          {item.children.map((child: any) => (
            <FileTreeItem key={child.id} item={child} level={level + 1} onFileSelect={onFileSelect} onContextAction={onContextAction} forceCollapsed={forceCollapsed} />
          ))}
        </div>
      )}
    </div>
  );
}
