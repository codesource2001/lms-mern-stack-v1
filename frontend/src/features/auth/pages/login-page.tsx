import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginSchema } from '@/features/auth/schemas';
import { login } from '@/features/auth/api';
import { useAuthStore } from '@/stores/auth-store';
import type { z } from 'zod';

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
      void navigate('/app', { replace: true });
    },
  });

  return (
    <div className="mx-auto max-w-md space-y-6 px-6 py-16">
      <div>
        <h1 className="font-display text-3xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Use your Atrium account to continue.</p>
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
            autoComplete="current-password"
            {...form.register('password')}
          />
          {form.formState.errors.password ? (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          ) : null}
        </div>
        {mutation.isError ? (
          <p className="text-sm text-destructive">{mutation.error.message}</p>
        ) : null}
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <div className="flex justify-between text-sm">
        <Link to="/forgot-password" className="text-brand underline">
          Forgot password?
        </Link>
        <Link to="/register" className="text-brand underline">
          Create account
        </Link>
      </div>
    </div>
  );
}
