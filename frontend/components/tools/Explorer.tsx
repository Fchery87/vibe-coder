/**
 * Explorer Tool
 * GitHub-powered file tree with search and virtual scrolling
 * Integrates with Phase 1 Multi-File Tabs and Phase 2 Virtual Scrolling
 */

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  Search,
  RefreshCw,
  FolderPlus,
  FilePlus,
} from 'lucide-react';
import ToolDrawerPanel, { ToolEmptyState, ToolLoadingState, ToolErrorState } from '@/components/ToolDrawerPanel';
import { FileTreeSkeleton } from '@/components/Skeleton';

interface ExplorerProps {
  owner?: string;
  repo?: string;
  branch?: string;
  installationId?: number;
  onFileSelect?: (filePath: string, content?: string) => void;
}

interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  sha?: string;
  children?: FileNode[];
}

interface FlattenedNode extends FileNode {
  level: number;
  isExpanded?: boolean;
}

export default function Explorer({
  owner,
  repo,
  branch = 'main',
  installationId,
  onFileSelect,
}: ExplorerProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activePath, setActivePath] = useState<string | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Fetch files from GitHub
  useEffect(() => {
    if (!owner || !repo || !installationId) {
      return;
    }

    const fetchFiles = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/github/files?owner=${owner}&repo=${repo}&branch=${branch}&installationId=${installationId}`
        );
        const data = await response.json();

        if (data.error) {
          setError(data.message);
          setFiles([]);
        } else {
          setFiles(data.tree || []);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch files');
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [owner, repo, branch, installationId]);

  // Flatten tree structure for virtual scrolling
  const flattenedItems = useMemo(() => {
    const flattened: FlattenedNode[] = [];

    const flatten = (nodes: FileNode[], level: number) => {
      nodes.forEach((node) => {
        const isExpanded = expandedFolders.has(node.id);

        // Apply search filter
        if (searchQuery) {
          const matchesSearch = node.path.toLowerCase().includes(searchQuery.toLowerCase());
          if (!matchesSearch) {
            // Check if any children match
            const hasMatchingChild = node.children?.some(child =>
              child.path.toLowerCase().includes(searchQuery.toLowerCase())
            );
            if (!hasMatchingChild) return;
          }
        }

        flattened.push({ ...node, level, isExpanded });

        if (node.type === 'folder' && node.children && isExpanded) {
          flatten(node.children, level + 1);
        }
      });
    };

    flatten(files, 0);
    return flattened;
  }, [files, expandedFolders, searchQuery]);

  // Virtual scrolling
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
    if (item.type === 'folder') {
      toggleFolder(item.id);
    } else {
      setActivePath(item.path);
      onFileSelect?.(item.path);
    }
  };

  const expandAll = () => {
    const allFolderIds = new Set<string>();
    const collectFolders = (nodes: FileNode[]) => {
      nodes.forEach((node) => {
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

  const handleRefresh = async () => {
    if (!owner || !repo) return;

    // Clear cache first
    await fetch(
      `/api/github/files?owner=${owner}&repo=${repo}&branch=${branch}`,
      { method: 'DELETE' }
    );

    // Refetch
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/github/files?owner=${owner}&repo=${repo}&branch=${branch}&installationId=${installationId}`
      );
      const data = await response.json();

      if (data.error) {
        setError(data.message);
        setFiles([]);
      } else {
        setFiles(data.tree || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refresh files');
    } finally {
      setIsLoading(false);
    }
  };

  // Empty state when not configured
  if (!owner || !repo || !installationId) {
    return (
      <ToolDrawerPanel toolName="Explorer">
        <ToolEmptyState
          icon={<Folder className="w-12 h-12" />}
          title="No Repository Selected"
          description="Select a GitHub repository in Settings to browse files"
          actionLabel="Open Settings"
          onAction={() => {
            // TODO: Open settings modal
            console.log('Open settings');
          }}
        />
      </ToolDrawerPanel>
    );
  }

  // Loading state
  if (isLoading && files.length === 0) {
    return (
      <ToolDrawerPanel toolName="Explorer">
        <FileTreeSkeleton />
      </ToolDrawerPanel>
    );
  }

  // Error state
  if (error) {
    return (
      <ToolDrawerPanel toolName="Explorer">
        <ToolErrorState
          title="Failed to Load Files"
          message={error}
          onRetry={handleRefresh}
        />
      </ToolDrawerPanel>
    );
  }

  return (
    <ToolDrawerPanel toolName="Explorer">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 space-y-3 border-b border-[var(--border)]">
          {/* Title and Actions */}
          <div className="flex items-center justify-between">
            <div className="leading-tight">
              <h3 className="font-semibold" style={{ fontSize: 'var(--size-h2)' }}>
                {repo}
              </h3>
              <p className="text-[var(--size-small)] text-[var(--muted)]">
                {flattenedItems.length} items
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                className="p-1.5 rounded hover:bg-slate-700/30 transition-colors"
                title="Refresh"
                type="button"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={expandAll}
                className="px-2 py-1 text-xs rounded hover:bg-slate-700/30 transition-colors"
                type="button"
                title="Expand all"
              >
                Expand
              </button>
              <button
                onClick={collapseAll}
                className="px-2 py-1 text-xs rounded hover:bg-slate-700/30 transition-colors"
                type="button"
                title="Collapse all"
              >
                Collapse
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-10 pr-3 py-2 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>

        {/* Virtual Scrolling Container */}
        <div
          ref={parentRef}
          className="flex-1 overflow-auto"
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
              const paddingLeft = item.level * 16 + 8;

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
                  <button
                    type="button"
                    className={`w-full flex items-center gap-2 py-1.5 px-2 text-left transition-colors ${
                      isActive
                        ? 'bg-purple-500/20 text-[var(--text)]'
                        : 'hover:bg-slate-700/30 text-[var(--muted)]'
                    }`}
                    style={{ paddingLeft: `${paddingLeft}px` }}
                    onClick={() => handleItemClick(item)}
                  >
                    {item.type === 'folder' ? (
                      item.isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                      )
                    ) : (
                      <div className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
                    {item.type === 'folder' ? (
                      <Folder className="w-4 h-4 flex-shrink-0 text-purple-400" />
                    ) : (
                      <FileText className="w-4 h-4 flex-shrink-0 text-blue-400" />
                    )}
                    <span className="truncate text-sm">{item.name}</span>
                    {item.size !== undefined && item.type === 'file' && (
                      <span className="ml-auto text-xs text-[var(--muted)]">
                        {formatFileSize(item.size)}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ToolDrawerPanel>
  );
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
