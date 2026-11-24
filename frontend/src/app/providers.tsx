import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import type { PropsWithChildren } from 'react';

import { queryClient } from '@/lib/query-client';
import { ThemeProvider } from '@/components/common/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
