import type * as React from 'react';

import { cn } from '@/lib/utils';

const alertVariants = {
  default: 'bg-background text-foreground',
  destructive:
    'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
};

export function Alert({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & { variant?: keyof typeof alertVariants }) {
  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border px-4 py-3 text-sm',
        alertVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: React.ComponentProps<'h5'>) {
  return (
    <h5 className={cn('mb-1 leading-none font-medium tracking-tight', className)} {...props} />
  );
}

export function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />;
}
