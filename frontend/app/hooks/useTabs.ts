"use client";

import { useState, useCallback } from 'react';
import type { Tab } from '@/components/TabBar';

export interface UseTabsReturn {
  tabs: Tab[];
  activeTabId: string | null;
  activeTab: Tab | null;
  openTab: (filePath: string, content: string, fileName?: string) => string;
  closeTab: (tabId: string) => void;
  selectTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  markTabDirty: (tabId: string, isDirty: boolean) => void;
  closeAllTabs: () => void;
  getTabByPath: (filePath: string) => Tab | undefined;
}

export function useTabs(): UseTabsReturn {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Get active tab
  const activeTab = tabs.find(tab => tab.id === activeTabId) || null;

  // Generate unique tab ID
  const generateTabId = (filePath: string): string => {
    return `tab-${filePath}-${Date.now()}`;
  };

  // Open a new tab or switch to existing one
  const openTab = useCallback((filePath: string, content: string, fileName?: string): string => {
    // Check if tab already exists
    const existingTab = tabs.find(tab => tab.filePath === filePath);

    if (existingTab) {
      // Tab exists, just switch to it
      setActiveTabId(existingTab.id);
      return existingTab.id;
    }

    // Create new tab
    const newTab: Tab = {
      id: generateTabId(filePath),
      filePath,
      fileName: fileName || filePath.split('/').pop() || filePath,
      content,
      isDirty: false,
      language: getLanguageFromPath(filePath)
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    return newTab.id;
  }, [tabs]);

  // Close a tab
  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const filtered = prev.filter(tab => tab.id !== tabId);

      // If we closed the active tab, switch to another
      if (tabId === activeTabId) {
        const closedIndex = prev.findIndex(tab => tab.id === tabId);

        if (filtered.length > 0) {
          // Switch to the tab to the right, or left if it was the last tab
          const newActiveTab = filtered[Math.min(closedIndex, filtered.length - 1)];
          setActiveTabId(newActiveTab.id);
        } else {
          setActiveTabId(null);
        }
      }

      return filtered;
    });
  }, [activeTabId]);

  // Select a tab
  const selectTab = useCallback((tabId: string) => {
    if (tabs.find(tab => tab.id === tabId)) {
      setActiveTabId(tabId);
    }
  }, [tabs]);

  // Update tab content
  const updateTabContent = useCallback((tabId: string, content: string) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id === tabId) {
        // Mark as dirty if content changed
        const isDirty = content !== tab.content;
        return { ...tab, content, isDirty };
      }
      return tab;
    }));
  }, []);

  // Mark tab as dirty (has unsaved changes)
  const markTabDirty = useCallback((tabId: string, isDirty: boolean) => {
    setTabs(prev => prev.map(tab =>
      tab.id === tabId ? { ...tab, isDirty } : tab
    ));
  }, []);

  // Close all tabs
  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  // Get tab by file path
  const getTabByPath = useCallback((filePath: string): Tab | undefined => {
    return tabs.find(tab => tab.filePath === filePath);
  }, [tabs]);

  return {
    tabs,
    activeTabId,
    activeTab,
    openTab,
    closeTab,
    selectTab,
    updateTabContent,
    markTabDirty,
    closeAllTabs,
    getTabByPath
  };
}

// Helper function to get language from file path
function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const langMap: { [key: string]: string } = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'css': 'css',
    'scss': 'css',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust'
  };
  return langMap[ext || ''] || 'plaintext';
}
