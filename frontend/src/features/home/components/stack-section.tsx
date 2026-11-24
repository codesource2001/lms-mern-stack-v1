import { Card } from '@/components/ui/card';
import { stackGroups } from '@/features/home/home-content';

export function StackSection() {
  return (
    <section id="stack" className="scroll-mt-24 border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-brand uppercase">
            Verified toolchain
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl">
            Current versions, chosen deliberately.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Every runtime and package below was checked against the official registry before
            installation. No deprecated APIs, no unverified versions.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {stackGroups.map((group) => (
            <Card key={group.title} className="p-6">
              <h3 className="font-display text-lg font-semibold tracking-tight">{group.title}</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <li key={item}>
                    <span className="inline-flex rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground/80">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-amber/30 bg-amber-soft/60 p-5">
          <p className="text-sm font-semibold">Version policy</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Versions were verified on 24 November 2026. TypeScript is pinned to 5.9.3 because the
            typescript-eslint toolchain does not yet support TypeScript 7. Any runtime or major
            version upgrade requires an ADR, a green CI run, and an updated lockfile.
          </p>
        </div>
      </div>
    </section>
  );
}
