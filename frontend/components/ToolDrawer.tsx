/**
 * ToolDrawer Component - Vertical Rail Design
 * Persistent vertical rail with icon-only default state, hover previews, and consistent badge visibility
 * Uses Phase 2 micro-interactions for smooth animations
 */

'use client';

import { useState, ReactNode, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export interface ToolDrawerTab {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: number | string;
  content: ReactNode;
}

interface ToolDrawerProps {
  tabs: ToolDrawerTab[];
  defaultTab?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function ToolDrawer({
  tabs,
  defaultTab,
  collapsed: controlledCollapsed,
  onCollapsedChange,
}: ToolDrawerProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const collapsed = controlledCollapsed ?? internalCollapsed;
  const setCollapsed = onCollapsedChange || setInternalCollapsed;

  const activeTabData = tabs.find((tab) => tab.id === activeTab);
  const hoveredTabData = tabs.find((tab) => tab.id === hoveredTab);

  // Show preview when hovering over an icon
  const handleIconHover = (tabId: string) => {
    if (isPinned) return;

    // Clear any pending hide timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }

    // Clear any pending show timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Show immediately if already hovering, with delay otherwise
    const delay = hoveredTab ? 0 : 300;

    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredTab(tabId);
      setActiveTab(tabId);
    }, delay);
  };

  const handleIconLeave = () => {
    if (isPinned) return;

    // Clear any pending show timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Don't hide immediately - wait to see if user moves to preview
    previewTimeoutRef.current = setTimeout(() => {
      setHoveredTab(null);
    }, 150);
  };

  const handlePreviewEnter = () => {
    if (isPinned) return;

    // Cancel hide timeout when entering preview
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
  };

  const handlePreviewLeave = () => {
    if (isPinned) return;

    // Hide immediately when leaving preview
    setHoveredTab(null);
  };

  const handleIconClick = (tabId: string) => {
    setActiveTab(tabId);
    if (collapsed) {
      // Pin the drawer open
      setIsPinned(true);
      setCollapsed(false);
    } else {
      // Toggle pin state
      if (activeTab === tabId && isPinned) {
        setIsPinned(false);
        setCollapsed(true);
      } else {
        setIsPinned(true);
      }
    }
  };

  const handleClose = () => {
    setIsPinned(false);
    setCollapsed(true);
    setHoveredTab(null);
  };

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, []);

  if (tabs.length === 0) {
    return null;
  }

  const showPreview = !isPinned && hoveredTab && !collapsed;
  const showPinnedContent = isPinned && !collapsed;

  return (
    <div className="flex relative">
      {/* Vertical Icon Rail - Always Visible */}
      <div className="panel flex flex-col w-12 border-r border-[var(--border)] bg-[var(--panel)] z-20">
        <div className="flex flex-col gap-1 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onMouseEnter={() => handleIconHover(tab.id)}
              onMouseLeave={handleIconLeave}
              onClick={() => handleIconClick(tab.id)}
              className={`relative p-2 rounded transition-all duration-200 ${
                activeTab === tab.id && (isPinned || hoveredTab === tab.id)
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-[var(--muted)] hover:bg-slate-700/30 hover:text-[var(--text)]'
              }`}
              title={tab.label}
            >
              {tab.icon}
              {tab.badge !== undefined && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] bg-purple-500 text-white rounded-full font-medium">
                  {typeof tab.badge === 'number' && tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Hover Preview - Floating Panel */}
      {showPreview && hoveredTabData && (
        <div
          className="absolute left-12 top-0 bottom-0 w-80 panel border-r border-[var(--border)] bg-[var(--panel)] shadow-2xl z-10 animate-in fade-in-0 slide-in-from-left-2 duration-150"
          onMouseEnter={handlePreviewEnter}
          onMouseLeave={handlePreviewLeave}
        >
          {/* Preview Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              {hoveredTabData.icon}
              <span className="text-sm font-medium">{hoveredTabData.label}</span>
              {hoveredTabData.badge !== undefined && (
                <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                  {hoveredTabData.badge}
                </span>
              )}
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto h-full">
            {hoveredTabData.content}
          </div>
        </div>
      )}

      {/* Pinned Content - Full Panel */}
      {showPinnedContent && activeTabData && (
        <div className="w-80 panel border-r border-[var(--border)] bg-[var(--panel)] flex flex-col">
          {/* Pinned Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              {activeTabData.icon}
              <span className="text-sm font-medium">{activeTabData.label}</span>
              {activeTabData.badge !== undefined && (
                <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                  {activeTabData.badge}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 hover:bg-slate-700/30 rounded transition-colors"
              title="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Pinned Content */}
          <div className="flex-1 overflow-auto">
            {activeTabData.content}
          </div>
        </div>
      )}
    </div>
  );
}
