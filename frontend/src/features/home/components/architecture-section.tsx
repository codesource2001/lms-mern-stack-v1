import { ChevronRight, Database, Layers, Workflow } from 'lucide-react';

import { Card } from '@/components/ui/card';

const pillars = [
  {
    icon: Layers,
    title: 'Interface',
    description:
      'React 19, React Router 8, TanStack Query, and Tailwind 4. Feature modules keep UI, state, and data concerns close to where they are used.',
    note: 'Accessible primitives · typed boundaries · route-level splitting',
  },
  {
    icon: Workflow,
    title: 'API',
    description:
      'Express 5 in a layered modular monolith. Routes stay thin, services own business rules, and repositories own persistence.',
    note: 'Zod at the edge · centralized errors · deny-by-default access',
  },
  {
    icon: Database,
    title: 'Data',
    description:
      'MongoDB 8.3 and Redis 8.12 are provisioned locally. Schema design, compound indexes, transactions, and cache boundaries start in Phase 2.',
    note: 'Indexed queries · duplicate-safe enrollment · graceful shutdown',
  },
];

const lifecycle = [
  'Request',
  'Validation',
  'Authorization',
  'Controller',
  'Service',
  'Repository',
  'MongoDB',
];

export function ArchitectureSection() {
  return (
    <section id="architecture" className="scroll-mt-24 border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-brand uppercase">
            Architecture
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl">
            Separated by default. Connected by contract.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Two deployable applications, one explicit API contract, and a strict dependency
            direction inside every backend module.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {pillars.map(({ icon: Icon, title, description, note }) => (
            <Card key={title} className="p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
              <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                {note}
              </p>
            </Card>
          ))}
        </div>

        <Card className="mt-5 overflow-hidden">
          <div className="border-b border-border bg-muted/50 px-5 py-3.5 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Request lifecycle · backend module contract
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 p-5">
            {lifecycle.map((step, index) => (
              <div key={step} className="flex items-center gap-2">
                <span className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium">
                  {step}
                </span>
                {index < lifecycle.length - 1 ? (
                  <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
                ) : null}
              </div>
            ))}
          </div>
          <p className="border-t border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground">
            Phase 1 implements the application shell, response envelope, and centralized error
            boundary. Persistence and access control land in Phases 2–3.
          </p>
        </Card>
      </div>
    </section>
  );
}
