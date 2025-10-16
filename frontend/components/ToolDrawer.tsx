/**
 * ToolDrawer Component - Vertical Rail Design
 * Persistent vertical rail with icon-only default state, hover previews, and consistent badge visibility
 * Uses Phase 2 micro-interactions for smooth animations
 */

'use client';

import { useState, ReactNode, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

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
  const highlightedTab = hoveredTab ?? activeTab;

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
  const handleToggleChange = (nextValue: string) => {
    if (!nextValue) return;
    handleIconClick(nextValue);
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="relative flex">
        {/* Vertical Icon Rail - Always Visible */}
        <div className="panel z-20 flex w-12 flex-col border-r border-[var(--border)] bg-[var(--panel)]">
          <ToggleGroup
            type="single"
            orientation="vertical"
            value={highlightedTab}
            onValueChange={handleToggleChange}
            className="flex flex-col gap-1 p-2"
          >
            {tabs.map((tab) => (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value={tab.id}
                    size="sm"
                    className="relative w-full justify-center rounded-lg border border-transparent text-[var(--muted)] transition-all data-[state=on]:border-purple-400/40 data-[state=on]:bg-purple-500/20 data-[state=on]:text-purple-200 hover:bg-slate-700/30 hover:text-[var(--text)]"
                    onMouseEnter={() => handleIconHover(tab.id)}
                    onMouseLeave={handleIconLeave}
                    aria-label={tab.label}
                  >
                    {tab.icon}
                    {tab.badge !== undefined && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-purple-500 px-1 text-[10px] font-medium text-white">
                        {typeof tab.badge === 'number' && tab.badge > 9 ? '9+' : tab.badge}
                      </span>
                    )}
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs font-medium">
                  {tab.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </ToggleGroup>
        </div>

      {/* Hover Preview - Floating Panel */}
        {showPreview && hoveredTabData && (
          <div
            className="panel absolute left-12 top-0 bottom-0 z-10 w-80 border-r border-[var(--border)] bg-[var(--panel)] shadow-2xl animate-in fade-in-0 slide-in-from-left-2 duration-150"
            onMouseEnter={handlePreviewEnter}
            onMouseLeave={handlePreviewLeave}
          >
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
              {hoveredTabData.icon}
              <span className="text-sm font-medium">{hoveredTabData.label}</span>
              {hoveredTabData.badge !== undefined && (
                <Badge variant="outline" className="border-purple-400/40 bg-purple-500/10 text-purple-200">
                  {hoveredTabData.badge}
                </Badge>
              )}
            </div>
            <div className="h-full flex-1 overflow-auto">{hoveredTabData.content}</div>
          </div>
        )}

      {/* Pinned Content - Full Panel */}
        {showPinnedContent && activeTabData && (
          <div className="panel flex w-80 flex-col border-r border-[var(--border)] bg-[var(--panel)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-2">
                {activeTabData.icon}
                <span className="text-sm font-medium">{activeTabData.label}</span>
                {activeTabData.badge !== undefined && (
                  <Badge variant="outline" className="border-purple-400/40 bg-purple-500/10 text-purple-200">
                    {activeTabData.badge}
                  </Badge>
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded p-1 transition-colors hover:bg-slate-700/30"
                    aria-label="Close sidebar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  Close sidebar
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex-1 overflow-auto">{activeTabData.content}</div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
