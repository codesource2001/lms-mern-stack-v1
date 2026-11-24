import { useEffect } from 'react';

import { useUiStore } from '@/stores/ui-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUiStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
  }, [theme]);

  return <>{children}</>;
}
