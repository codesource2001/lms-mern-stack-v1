import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerSchema } from '@/features/auth/schemas';
import { register as registerAccount } from '@/features/auth/api';
import type { z } from 'zod';

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: RegisterForm) =>
      registerAccount({ name: values.name, email: values.email, password: values.password }),
  });

  return (
    <div className="mx-auto max-w-md space-y-6 px-6 py-16">
      <div>
        <h1 className="font-display text-3xl font-semibold">Create account</h1>
        <p className="mt-2 text-sm text-muted-foreground">Start learning with Atrium.</p>
      </div>
      <form
        className="space-y-4"
        onSubmit={
          form.handleSubmit((values) => {
            mutation.mutate(values);
          }) as (event: FormEvent<HTMLFormElement>) => void
        }
      >
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" autoComplete="name" {...form.register('name')} />
          {form.formState.errors.name ? (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
          {form.formState.errors.email ? (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...form.register('password')}
          />
          {form.formState.errors.password ? (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...form.register('confirmPassword')}
          />
          {form.formState.errors.confirmPassword ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.confirmPassword.message}
            </p>
          ) : null}
        </div>
        {mutation.isError ? (
          <p className="text-sm text-destructive">{mutation.error.message}</p>
        ) : null}
        {mutation.isSuccess ? (
          <p className="text-sm text-green-700">{mutation.data.message}</p>
        ) : null}
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating…' : 'Create account'}
        </Button>
      </form>
      <p className="text-sm">
        Already have an account?{' '}
        <Link to="/login" className="text-brand underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
