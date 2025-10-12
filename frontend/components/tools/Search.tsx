/**
 * Search Tool
 * Code and filename search across repository
 * Integrates with Phase 1 Multi-File Tabs
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search as SearchIcon, FileText, Code, AlertCircle, Clock, X, Filter } from 'lucide-react';
import ToolDrawerPanel, { ToolEmptyState, ToolErrorState } from '@/components/ToolDrawerPanel';
import Skeleton from '@/components/Skeleton';

interface SearchProps {
  owner?: string;
  repo?: string;
  installationId?: number;
  onFileSelect?: (path: string) => void;
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface SearchResult {
  name: string;
  path: string;
  sha: string;
  url: string;
  score: number;
  type?: string;
  text_matches?: Array<{
    fragment: string;
    matches: Array<{ text: string; indices: number[] }>;
  }>;
}

interface SearchResponse {
  total_count: number;
  items: SearchResult[];
  type: 'code' | 'filename';
  fallback?: boolean;
  cached?: boolean;
  rateLimit?: {
    remaining: number;
    resetIn: number;
  };
}

export default function Search({
  owner,
  repo,
  installationId,
  onFileSelect,
  onNotification,
}: SearchProps) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'code' | 'filename'>('code');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [resultType, setResultType] = useState<'code' | 'filename'>('code');
  const [isFallback, setIsFallback] = useState(false);
  const [rateLimit, setRateLimit] = useState<{ remaining: number; resetIn: number } | null>(null);

  // Filters
  const [extensionFilter, setExtensionFilter] = useState('');
  const [pathFilter, setPathFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || !owner || !repo || !installationId) {
      setResults([]);
      setTotalCount(0);
      setError(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [query, searchType, owner, repo, installationId]);

  const handleSearch = async () => {
    if (!query.trim() || !owner || !repo || !installationId) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/github/search?q=${encodeURIComponent(query)}&owner=${owner}&repo=${repo}&type=${searchType}&installationId=${installationId}`
      );
      const data: SearchResponse & { error?: boolean; message?: string } = await response.json();

      if (data.error) {
        setError(data.message || 'Search failed');
        setResults([]);
        setTotalCount(0);

        // Check if rate limit error
        if (data.rateLimit) {
          setRateLimit(data.rateLimit);
          onNotification?.(
            `Rate limit exceeded. ${data.rateLimit.remaining} searches remaining. Reset in ${data.rateLimit.resetIn}s.`,
            'error'
          );
        }
      } else {
        setResults(data.items || []);
        setTotalCount(data.total_count || 0);
        setResultType(data.type);
        setIsFallback(data.fallback || false);
        setRateLimit(data.rateLimit || null);

        if (data.fallback) {
          onNotification?.(
            'Code search unavailable. Showing filename search results.',
            'info'
          );
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search');
      setResults([]);
      setTotalCount(0);
    } finally {
      setIsSearching(false);
    }
  };

  // Apply filters to results
  const filteredResults = results.filter((result) => {
    if (extensionFilter && !result.name.endsWith(extensionFilter)) {
      return false;
    }
    if (pathFilter && !result.path.toLowerCase().includes(pathFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleResultClick = (result: SearchResult) => {
    onFileSelect?.(result.path);
  };

  // Empty state when not configured
  if (!owner || !repo || !installationId) {
    return (
      <ToolDrawerPanel toolName="Search">
        <ToolEmptyState
          icon={<SearchIcon className="w-12 h-12" />}
          title="No Repository Selected"
          description="Select a GitHub repository in Settings to search code"
          actionLabel="Open Settings"
          onAction={() => {
            console.log('Open settings');
          }}
        />
      </ToolDrawerPanel>
    );
  }

  return (
    <ToolDrawerPanel toolName="Search">
      <div className="flex flex-col h-full">
        {/* Header with Search Input */}
        <div className="p-4 border-b border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ fontSize: 'var(--size-h2)' }}>
              Search
            </h3>
            {rateLimit && (
              <div className="text-xs text-[var(--muted)] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {rateLimit.remaining}/10 searches
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search code or files..."
              className="w-full pl-10 pr-10 py-2 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-purple-500 transition-colors"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-700/30 rounded transition-colors"
                type="button"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Search Type Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchType('code')}
              className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors flex items-center justify-center gap-1.5 ${
                searchType === 'code'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                  : 'bg-slate-800/50 text-[var(--muted)] hover:bg-slate-700/30'
              }`}
              type="button"
            >
              <Code className="w-3 h-3" />
              Code
            </button>
            <button
              onClick={() => setSearchType('filename')}
              className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors flex items-center justify-center gap-1.5 ${
                searchType === 'filename'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                  : 'bg-slate-800/50 text-[var(--muted)] hover:bg-slate-700/30'
              }`}
              type="button"
            >
              <FileText className="w-3 h-3" />
              Filename
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-2 py-1.5 text-xs rounded transition-colors ${
                showFilters
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-slate-800/50 text-[var(--muted)] hover:bg-slate-700/30'
              }`}
              type="button"
              title="Filters"
            >
              <Filter className="w-3 h-3" />
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="space-y-2 p-3 bg-slate-800/30 rounded-lg border border-[var(--border)]">
              <div>
                <label className="text-xs text-[var(--muted)] block mb-1">Extension</label>
                <input
                  type="text"
                  value={extensionFilter}
                  onChange={(e) => setExtensionFilter(e.target.value)}
                  placeholder=".tsx, .ts, .js..."
                  className="w-full px-2 py-1 bg-[var(--panel)] border border-[var(--border)] rounded text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] block mb-1">Path contains</label>
                <input
                  type="text"
                  value={pathFilter}
                  onChange={(e) => setPathFilter(e.target.value)}
                  placeholder="src/components..."
                  className="w-full px-2 py-1 bg-[var(--panel)] border border-[var(--border)] rounded text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
              {(extensionFilter || pathFilter) && (
                <button
                  onClick={() => {
                    setExtensionFilter('');
                    setPathFilter('');
                  }}
                  className="w-full px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                  type="button"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Results Count */}
          {query && !isSearching && (
            <div className="flex items-center justify-between text-xs text-[var(--muted)]">
              <span>
                {filteredResults.length} of {totalCount} results
                {isFallback && ' (filename search)'}
              </span>
              {results.length > filteredResults.length && (
                <span className="text-yellow-400">Filters applied</span>
              )}
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-auto">
          {isSearching ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full p-4">
              <ToolErrorState message={error} onRetry={handleSearch} />
            </div>
          ) : !query ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <SearchIcon className="w-12 h-12 text-[var(--muted)] mb-4" />
              <p className="text-sm text-[var(--muted)]">Search for code or files</p>
              <p className="text-xs text-[var(--muted)] mt-1">
                Use filters to narrow down results
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <AlertCircle className="w-12 h-12 text-[var(--muted)] mb-4" />
              <p className="text-sm text-[var(--muted)]">No results found</p>
              <p className="text-xs text-[var(--muted)] mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filteredResults.map((result, index) => (
                <div
                  key={`${result.path}-${index}`}
                  className="p-3 hover:bg-slate-700/30 cursor-pointer transition-colors"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{result.name}</div>
                      <div className="text-xs text-[var(--muted)] truncate">{result.path}</div>

                      {/* Code snippet for code search results */}
                      {result.text_matches && result.text_matches.length > 0 && (
                        <div className="mt-2 p-2 bg-slate-900/50 rounded text-xs font-mono overflow-x-auto">
                          <code className="text-[var(--muted)]">
                            {result.text_matches[0].fragment.substring(0, 100)}
                            {result.text_matches[0].fragment.length > 100 && '...'}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolDrawerPanel>
  );
}
