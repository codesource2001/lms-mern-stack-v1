import { Outlet } from 'react-router';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-muted/30">
      <Outlet />
    </div>
  );
}
