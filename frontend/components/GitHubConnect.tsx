'use client';

import { useState, useEffect } from 'react';
import { Github, LogOut, AlertCircle } from 'lucide-react';
import { GitHubUser } from '@/lib/github-types';
import { Button } from "@/components/ui/button";

interface GitHubConnectProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export default function GitHubConnect({ onConnect, onDisconnect }: GitHubConnectProps) {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();

    // Check for OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('github_connected') === 'true') {
      checkAuth();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('error')) {
      setError(params.get('error') || 'Authentication failed');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/github/user');
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setUser(null);
        return;
      }

      if (data.isLoggedIn && data.user) {
        setError(null);
        setUser(data.user);
        onConnect?.();
      } else {
        setError(null);
        setUser(null);
      }
    } catch (err: any) {
      console.error('Auth check failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = '/api/github/oauth/login';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/github/oauth/logout', { method: 'POST' });
      setUser(null);
      onDisconnect?.();
    } catch (err: any) {
      console.error('Logout failed:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <Button variant="secondary" size="sm" disabled>
        <Github className="icon animate-pulse" />
        <span>Connecting...</span>
      </Button>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-sm">
        <AlertCircle className="w-4 h-4" />
        <span>{error}</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--panel-alt)] rounded-[var(--radius)] border border-[var(--border)]">
          <img
            src={user.avatar_url}
            alt={user.login}
            className="w-6 h-6 rounded-full"
          />
          <span className="text-sm text-[var(--text)]">{user.login}</span>
        </div>
        <Button
          onClick={handleLogout}
          variant="ghost"
          size="icon"
          title="Disconnect GitHub"
        >
          <LogOut className="icon" />
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleLogin} variant="secondary" size="sm">
      <Github className="icon" />
      <span>Connect GitHub</span>
    </Button>
  );
}
