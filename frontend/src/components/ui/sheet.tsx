import type * as React from 'react';

import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

export { Dialog as Sheet, DialogTrigger as SheetTrigger, DialogContent as SheetContent };

export function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('space-y-2', className)} {...props} />;
}
