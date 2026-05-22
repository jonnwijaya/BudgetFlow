'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggleButton() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-9 shrink-0" />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="h-9 w-9 rounded-lg shrink-0"
    >
      <Sun className={`h-4 w-4 transition-all ${isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
      <Moon className={`absolute h-4 w-4 transition-all ${isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} />
    </Button>
  );
}
