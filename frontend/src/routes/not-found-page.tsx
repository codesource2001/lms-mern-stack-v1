import { Link } from 'react-router';

import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-mono text-sm font-medium text-brand">404</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] text-balance sm:text-5xl">
        This page has not been built yet.
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
        Atrium ships phase by phase. The route you requested does not exist in this foundation
        build.
      </p>
      <Button asChild variant="outline" className="mt-8">
        <Link to="/">Return to the foundation overview</Link>
      </Button>
    </section>
  );
}
