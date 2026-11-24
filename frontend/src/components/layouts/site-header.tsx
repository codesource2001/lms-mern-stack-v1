import { Link } from 'react-router';

import { Brand } from '@/components/common/brand';
import { Badge } from '@/components/ui/badge';

const navigation = [
  { label: 'Architecture', href: '#architecture' },
  { label: 'Roadmap', href: '#roadmap' },
  { label: 'Stack', href: '#stack' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6 lg:px-8">
        <Link to="/" aria-label="Atrium home" className="rounded-md">
          <Brand />
        </Link>

        <nav aria-label="Page sections" className="hidden items-center gap-7 md:flex">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Badge variant="brand" className="hidden sm:inline-flex">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
            Phase 1
          </Badge>
          <a
            href="#roadmap"
            className="inline-flex h-9 items-center rounded-full border border-border bg-card px-4 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
          >
            Roadmap
          </a>
        </div>
      </div>

      <div className="border-t border-border/70 md:hidden">
        <nav
          aria-label="Page sections"
          className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-6 py-2.5 text-sm text-muted-foreground"
        >
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="shrink-0 transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
