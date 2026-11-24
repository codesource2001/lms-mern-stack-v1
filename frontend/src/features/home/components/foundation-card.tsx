import { Circle, Check } from 'lucide-react';

import { Card } from '@/components/ui/card';

const foundationChecks = [
  { label: 'React 19 + Vite 8 interface shell', status: 'verified' },
  { label: 'Express 5 API foundation', status: 'verified' },
  { label: 'Strict TypeScript, ESLint, Prettier', status: 'verified' },
  { label: 'Vitest + Supertest smoke suites', status: 'verified' },
  { label: 'MongoDB 8.3 + Redis 8.12 compose stack', status: 'provisioned' },
] as const;

export function FoundationCard() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
      <div
        aria-hidden="true"
        className="absolute -inset-8 -z-10 rounded-full bg-brand-soft opacity-70 blur-3xl"
      />
      <Card className="overflow-hidden border-primary/30 bg-ink text-background shadow-lift">
        <div className="border-b border-white/10 px-6 py-5 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <p className="font-display text-base font-medium">Foundation checklist</p>
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-background/70 uppercase">
              Phase 1
            </span>
          </div>
          <p className="mt-1 text-sm text-background/60">Verified against the local toolchain</p>
        </div>

        <ul className="divide-y divide-white/10 px-6 sm:px-7">
          {foundationChecks.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-4 py-3.5">
              <span className="text-sm text-background/85">{item.label}</span>
              {item.status === 'verified' ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-amber">
                  <Check className="size-3.5" aria-hidden="true" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-background/50">
                  <Circle className="size-2.5" aria-hidden="true" />
                  Provisioned
                </span>
              )}
            </li>
          ))}
        </ul>

        <div className="border-t border-white/10 px-6 py-5 sm:px-7">
          <div className="flex items-center justify-between text-xs text-background/60">
            <span>Delivery progress</span>
            <span className="font-mono">1 / 15 phases</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[6.7%] rounded-full bg-amber" />
          </div>
          <p className="mt-3 text-xs text-background/55">Next: database and backend foundation.</p>
        </div>
      </Card>
    </div>
  );
}
