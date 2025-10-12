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

  const activeTab = tabs.find(tab => tab.id === activeTabId) || null;

  const generateTabId = (filePath: string): string => {
    return `tab-${filePath}-${Date.now()}`;
  };

  const openTab = useCallback((filePath: string, content: string, fileName?: string): string => {
    const existingTab = tabs.find(tab => tab.filePath === filePath);

    if (existingTab) {
      setActiveTabId(existingTab.id);
      return existingTab.id;
    }

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

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const filtered = prev.filter(tab => tab.id !== tabId);

      if (tabId === activeTabId) {
        const closedIndex = prev.findIndex(tab => tab.id === tabId);

        if (filtered.length > 0) {
          const newActiveTab = filtered[Math.min(closedIndex, filtered.length - 1)];
          setActiveTabId(newActiveTab.id);
        } else {
          setActiveTabId(null);
        }
      }

      return filtered;
    });
  }, [activeTabId]);

  const selectTab = useCallback((tabId: string) => {
    if (tabs.find(tab => tab.id === tabId)) {
      setActiveTabId(tabId);
    }
  }, [tabs]);

  const updateTabContent = useCallback((tabId: string, content: string) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id === tabId) {
        const isDirty = content !== tab.content;
        return { ...tab, content, isDirty };
      }
      return tab;
    }));
  }, []);

  const markTabDirty = useCallback((tabId: string, isDirty: boolean) => {
    setTabs(prev => prev.map(tab =>
      tab.id === tabId ? { ...tab, isDirty } : tab
    ));
  }, []);

  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

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

