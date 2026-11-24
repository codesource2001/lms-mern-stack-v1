const foundationStats = [
  { label: 'Runtime', value: 'Node 24 LTS' },
  { label: 'Language', value: 'TypeScript 5.9' },
  { label: 'Interface', value: 'React 19.3' },
  { label: 'Data', value: 'MongoDB + Redis' },
];

export function FoundationStats() {
  return (
    <div
      aria-label="Verified foundation versions"
      className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4"
    >
      {foundationStats.map((stat) => (
        <div key={stat.label} className="bg-card p-5">
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {stat.label}
          </p>
          <p className="mt-1.5 font-display text-lg font-semibold tracking-tight">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
