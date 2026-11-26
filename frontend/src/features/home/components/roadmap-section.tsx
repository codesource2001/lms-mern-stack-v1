import { ArrowRight, Check, Circle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { roadmapPhases, type PhaseStatus } from '@/features/home/home-content';

function PhaseStatusLabel({ status }: { status: PhaseStatus }) {
  if (status === 'complete') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] text-amber uppercase">
        <Check className="size-3" aria-hidden="true" />
        Complete
      </span>
    );
  }

  if (status === 'next') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] text-background uppercase">
        <span className="size-1.5 animate-pulse rounded-full bg-amber motion-reduce:animate-none" />
        Next
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] text-background/85 uppercase">
      <Circle className="size-2.5" aria-hidden="true" />
      Planned
    </span>
  );
}

export function RoadmapSection() {
  return (
    <section id="roadmap" className="scroll-mt-24 bg-ink text-background">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-amber uppercase">
              Delivery roadmap
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl">
              Fifteen phases. No skipped foundations.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-background/85">
              Each phase ships with a working vertical slice, documentation, and a green quality
              gate before the next one begins.
            </p>
          </div>
          <a
            className="inline-flex items-center gap-2 text-sm font-medium text-background/80 transition-colors hover:text-background"
            href="#stack"
          >
            Inspect the verified stack
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </div>

        <ol className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {roadmapPhases.map((phase) => (
            <li
              key={phase.number}
              className={cn(
                'relative bg-ink p-6',
                phase.status === 'complete' && 'bg-white/[0.055]',
                phase.status === 'next' && 'bg-white/[0.075]',
              )}
            >
              {phase.status === 'next' ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber/70 to-transparent"
                />
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-[11px] tracking-wide text-background/85">
                  Phase {String(phase.number).padStart(2, '0')}
                </span>
                <PhaseStatusLabel status={phase.status} />
              </div>
              <h3 className="mt-3 font-display text-lg font-medium tracking-tight">
                {phase.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-background/85">{phase.summary}</p>
            </li>
          ))}
        </ol>

        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-background/85">
          Phase gates are non-negotiable: formatting, lint, strict typecheck, tests, production
          build, and a written handoff. Security and accessibility checks are reviewed at every
          gate, not postponed to the end.
        </p>
      </div>
    </section>
  );
}
