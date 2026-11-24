import { Navigate, useLocation } from 'react-router';

import { useAuthStore } from '@/stores/auth-store';

export function ProtectedRoute({
  permission,
  children,
}: {
  permission?: string;
  children: React.ReactNode;
}) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (status === 'loading' || status === 'idle') {
    return <div className="p-8 text-sm text-muted-foreground">Loading session…</div>;
  }

  if (status !== 'authenticated' || user === null) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (permission !== undefined && !user.permissions.includes(permission)) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
