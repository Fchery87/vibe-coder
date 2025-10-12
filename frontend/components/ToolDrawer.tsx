/**
 * ToolDrawer Component
 * Collapsible sidebar drawer for sidebar tools (Explorer, Source Control, PR, etc.)
 * Uses Phase 2 micro-interactions for smooth animations
 */

'use client';

import { useState, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const collapsed = controlledCollapsed ?? internalCollapsed;
  const setCollapsed = onCollapsedChange || setInternalCollapsed;

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div
      className={`panel flex flex-col border-r border-[var(--border)] transition-all duration-300 ${
        collapsed ? 'w-12' : 'w-80'
      }`}
    >
      {/* Tab Bar */}
      <div className="flex items-center border-b border-[var(--border)]">
        {/* Collapse/Expand Button */}
        <button
          type="button"
          className="p-3 hover:bg-slate-700/30 transition-colors"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* Tabs */}
        {!collapsed && (
          <div className="flex-1 flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-3 py-3 text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'text-[var(--text)] border-b-2 border-purple-500'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-slate-700/30'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Area */}
      {!collapsed && activeTabData && (
        <div className="flex-1 overflow-auto">{activeTabData.content}</div>
      )}

      {/* Collapsed Icons */}
      {collapsed && (
        <div className="flex flex-col gap-2 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setCollapsed(false);
              }}
              className={`relative p-2 rounded transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-[var(--muted)] hover:bg-slate-700/30 hover:text-[var(--text)]'
              }`}
              title={tab.label}
            >
              {tab.icon}
              {tab.badge !== undefined && (
                <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[10px] bg-purple-500 text-white rounded-full">
                  {typeof tab.badge === 'number' && tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
