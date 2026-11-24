import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgotPasswordSchema } from '@/features/auth/schemas';
import { forgotPassword } from '@/features/auth/api';
import type { z } from 'zod';

type Form = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const form = useForm<Form>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });
  const mutation = useMutation({ mutationFn: (values: Form) => forgotPassword(values.email) });

  return (
    <div className="mx-auto max-w-md space-y-6 px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Forgot password</h1>
      <form
        className="space-y-4"
        onSubmit={
          form.handleSubmit((values) => {
            mutation.mutate(values);
          }) as (event: FormEvent<HTMLFormElement>) => void
        }
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register('email')} />
          {form.formState.errors.email ? (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          ) : null}
        </div>
        {mutation.isSuccess ? (
          <p className="text-sm text-green-700">{mutation.data.message}</p>
        ) : null}
        {mutation.isError ? (
          <p className="text-sm text-destructive">{mutation.error.message}</p>
        ) : null}
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          Send reset link
        </Button>
      </form>
      <Link to="/login" className="text-sm text-brand underline">
        Back to sign in
      </Link>
    </div>
  );
}
