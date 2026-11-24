import type * as React from 'react';
import {
  FormProvider,
  useFormContext,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';

import { cn } from '@/lib/utils';

export { FormProvider, useFormContext };

export function Form<TFieldValues extends FieldValues = FieldValues>({
  ...props
}: Omit<React.ComponentProps<'form'>, 'onSubmit'> & {
  form: UseFormReturn<TFieldValues>;
  onSubmit: (values: TFieldValues) => void | Promise<void>;
}) {
  const { form, onSubmit, className, children, ...rest } = props;
  return (
    <FormProvider {...form}>
      <form
        className={cn(className)}
        onSubmit={form.handleSubmit(onSubmit) as (event: React.FormEvent<HTMLFormElement>) => void}
        {...rest}
      >
        {children}
      </form>
    </FormProvider>
  );
}

export function FormField({
  name,
  children,
  className,
}: {
  name: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { formState } = useFormContext();
  const error = formState.errors[name]?.message;
  return (
    <div className={cn('space-y-2', className)}>
      {children}
      {typeof error === 'string' ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
