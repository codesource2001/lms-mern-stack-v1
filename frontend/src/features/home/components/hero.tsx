import { ArrowRight, Check } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FoundationCard } from '@/features/home/components/foundation-card';
import { FoundationStats } from '@/features/home/components/foundation-stats';

const guarantees = ['Two deployable apps', 'Strict TypeScript', 'CI-gated from day one'];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] opacity-40"
      />

      <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-16 sm:pt-24 lg:px-8 lg:pb-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <Badge
              variant="outline"
              className="gap-2 border-brand/25 bg-brand-soft/50 py-1 pr-3 pl-2 text-brand"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-50 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-brand" />
              </span>
              Phase 1 of 15 · Foundation online
            </Badge>

            <h1 className="mt-6 font-display text-5xl leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-6xl lg:text-[4.5rem]">
              Learning infrastructure with <span className="text-brand">product craft</span>.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Atrium is a production-oriented learning platform built in deliberate phases: secure
              API foundations, a scalable interface, and quality gates that hold. The foundation is
              verified. Domain features are next.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a href="#architecture">
                  Explore the architecture
                  <ArrowRight aria-hidden="true" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#roadmap">Read the roadmap</a>
              </Button>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {guarantees.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-brand" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <FoundationCard />
        </div>

        <FoundationStats />
      </div>
    </section>
  );
}
