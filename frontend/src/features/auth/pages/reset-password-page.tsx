import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPasswordSchema } from '@/features/auth/schemas';
import { resetPassword } from '@/features/auth/api';
import type { z } from 'zod';

type Form = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const form = useForm<Form>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: params.get('token') ?? '', password: '', confirmPassword: '' },
  });
  const mutation = useMutation({
    mutationFn: (values: Form) => resetPassword({ token: values.token, password: values.password }),
  });

  return (
    <div className="mx-auto max-w-md space-y-6 px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Reset password</h1>
      <form
        className="space-y-4"
        onSubmit={
          form.handleSubmit((values) => {
            mutation.mutate(values);
          }) as (event: FormEvent<HTMLFormElement>) => void
        }
      >
        <div className="space-y-2">
          <Label htmlFor="token">Reset token</Label>
          <Input id="token" {...form.register('token')} />
          {form.formState.errors.token ? (
            <p className="text-sm text-destructive">{form.formState.errors.token.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" {...form.register('password')} />
          {form.formState.errors.password ? (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" type="password" {...form.register('confirmPassword')} />
          {form.formState.errors.confirmPassword ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.confirmPassword.message}
            </p>
          ) : null}
        </div>
        {mutation.isSuccess ? (
          <p className="text-sm text-green-700">{mutation.data.message}</p>
        ) : null}
        {mutation.isError ? (
          <p className="text-sm text-destructive">{mutation.error.message}</p>
        ) : null}
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          Reset password
        </Button>
      </form>
    </div>
  );
}
