import { Brand } from '@/components/common/brand';
import { env } from '@/lib/env';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div className="flex flex-col gap-2">
          <Brand />
          <p className="text-sm text-muted-foreground">Learning, engineered in phases.</p>
        </div>
        <div className="text-sm text-muted-foreground sm:text-right">
          <p>
            © {year} {env.VITE_APP_NAME}. All rights reserved.
          </p>
          <p className="mt-1 text-xs">
            Phase 2 complete — Documentation lives in PLAN.md, AGENTS.md, and SECURITY.md.
          </p>
        </div>
      </div>
    </footer>
  );
}
