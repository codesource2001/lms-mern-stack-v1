import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { verifyEmail } from '@/features/auth/api';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const mutation = useMutation({ mutationFn: verifyEmail });

  useEffect(() => {
    if (token !== '') {
      mutation.mutate(token);
    }
  }, [token]);

  return (
    <div className="mx-auto max-w-md space-y-6 px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Verify email</h1>
      {token === '' ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get('token');
            if (typeof value === 'string') mutation.mutate(value);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="token">Verification token</Label>
            <Input id="token" name="token" />
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            Verify
          </Button>
        </form>
      ) : null}
      {mutation.isPending ? <p className="text-sm text-muted-foreground">Verifying…</p> : null}
      {mutation.isSuccess ? (
        <p className="text-sm text-green-700">{mutation.data.message}</p>
      ) : null}
      {mutation.isError ? (
        <p className="text-sm text-destructive">{mutation.error.message}</p>
      ) : null}
    </div>
  );
}
