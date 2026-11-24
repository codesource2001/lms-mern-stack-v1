import { cn } from '@/lib/utils';

function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-9', className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M8.5 24V14.5a7.5 7.5 0 0 1 15 0V24"
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        className="stroke-amber"
      />
      <path
        d="M12.75 24v-6.5a3.25 3.25 0 0 1 6.5 0V24"
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        className="stroke-primary-foreground"
      />
    </svg>
  );
}

function Brand({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <BrandMark />
      <span className="font-display text-lg font-semibold tracking-tight">Atrium</span>
    </span>
  );
}

export { Brand, BrandMark };
