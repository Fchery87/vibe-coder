'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ThemeToggle() {
  // Handle case where ThemeProvider hasn't mounted yet
  try {
    const { theme, toggleTheme } = useTheme();

    const setTheme = (next: 'light' | 'dark') => {
      if (next !== theme) {
        toggleTheme();
      }
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors duration-200 hover:bg-accent/10 dark:hover:bg-accent/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            type="button"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => setTheme('light')} className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTheme('dark')} className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => toggleTheme()} className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border border-current" />
            Toggle
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  } catch {
    // Fallback if ThemeProvider is not available
    return (
      <button
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm opacity-50 cursor-not-allowed"
        disabled
        title="Theme toggle loading..."
        type="button"
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">Theme toggle</span>
      </button>
    );
  }
}
