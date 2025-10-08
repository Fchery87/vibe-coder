"use client";

import { useState, useEffect, type MouseEvent, type ReactNode } from "react";
import {
  ChevronRight,
  Folder,
  FileText,
  Sparkles,
  Wrench,
  TestTube,
  Gauge
} from "lucide-react";

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
  const [allCollapsed, setAllCollapsed] = useState(true);
  const [activePath, setActivePath] = useState<string | null>(null);

  const toggleAllFolders = () => {
    setAllCollapsed((prev) => !prev);
  };

  const handleSelect = (path?: string) => {
    if (!path) return;
    setActivePath(path);
    onFileSelect?.(path);
  };

  return (
    <div className="panel h-full p-4 flex flex-col gap-[var(--gap-4)]">
      <div className="flex items-center justify-between">
        <div className="leading-tight">
          <h3 className="font-semibold" style={{ fontSize: 'var(--size-h2)' }}>Project Files</h3>
          <p className="text-[var(--size-small)] text-[var(--muted)]">Workspace tree</p>
        </div>
        <button
          onClick={toggleAllFolders}
          className="btn"
          type="button"
          title={allCollapsed ? "Expand all" : "Collapse all"}
        >
          {allCollapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>

      <div className="divider" />

      <div className="flex-1 overflow-auto space-y-1 pr-1">
        {initialData.map((item) => (
          <FileTreeItem
            key={item.id}
            item={item}
            level={0}
            onFileSelect={(path) => handleSelect(path)}
            onContextAction={onContextAction}
            forceCollapsed={allCollapsed}
            activePath={activePath}
          />
        ))}
      </div>
    </div>
  );
}

interface TreeItemProps {
  item: any;
  level: number;
  onFileSelect?: (filePath: string) => void;
  onContextAction?: (action: string, filename: string) => void;
  forceCollapsed?: boolean;
  activePath?: string | null;
}

function FileTreeItem({ item, level, onFileSelect, onContextAction, forceCollapsed, activePath }: TreeItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const isActive = activePath === item.path;

  useEffect(() => {
    if (forceCollapsed !== undefined) {
      setIsOpen(!forceCollapsed);
    }
  }, [forceCollapsed]);

  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  const handleContextMenu = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setShowContextMenu(true);
  };

  const handleContextAction = (action: string) => {
    onContextAction?.(action, item.name);
    setShowContextMenu(false);
  };

  const handlePrimaryClick = () => {
    if (hasChildren) {
      setIsOpen((prev) => !prev);
    } else if (item.path) {
      onFileSelect?.(item.path);
    }
  };

  return (
    <div>
      <div style={{ paddingLeft: level > 0 ? `${level * 16}px` : 0 }}>
        <div className="file-row">
          <div className="bar"></div>
          <button
            type="button"
            className="col-span-2 flex items-center justify-between gap-[var(--gap-3)] text-left"
            onClick={handlePrimaryClick}
            onContextMenu={handleContextMenu}
          >
            <div className="flex items-center gap-[var(--gap-2)] min-w-0">
              {hasChildren ? (
                <ChevronRight className="w-3.5 h-3.5 transition-transform" />
              ) : (
                <div className="w-3.5 h-3.5"></div>
              )}
              {hasChildren ? (
                <Folder className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span className="truncate text-[var(--size-small)]" style={{ color: isActive ? 'var(--text)' : 'var(--muted)' }}>
                {item.name}
              </span>
            </div>
          </button>
        </div>
      </div>

      {showContextMenu && !hasChildren && (
        <div
          className="fixed z-50 panel p-2 min-w-[220px] shadow-panel"
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
        >
          <div className="text-[var(--size-small)] text-[var(--muted)] mb-2">
            {item.name}
          </div>
          <div className="flex flex-col gap-[var(--gap-2)]">
            <ContextAction icon={<Sparkles className="w-3.5 h-3.5" />} label="Explain" onClick={() => handleContextAction('explain')} />
            <ContextAction icon={<Wrench className="w-3.5 h-3.5" />} label="Refactor" onClick={() => handleContextAction('refactor')} />
            <ContextAction icon={<TestTube className="w-3.5 h-3.5" />} label="Add tests" onClick={() => handleContextAction('add-tests')} />
            <ContextAction icon={<Gauge className="w-3.5 h-3.5" />} label="Optimize" onClick={() => handleContextAction('optimize')} />
          </div>
        </div>
      )}

      {hasChildren && isOpen && (
        <div className="space-y-1">
          {item.children.map((child: any) => (
            <FileTreeItem
              key={child.id}
              item={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              onContextAction={onContextAction}
              forceCollapsed={forceCollapsed}
              activePath={activePath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContextAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
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

















