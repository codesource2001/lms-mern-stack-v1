import { Link, NavLink, Outlet, useLocation } from 'react-router';

import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/features/notifications/notification-bell';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';

const navigation = [
  { label: 'Dashboard', to: '/app', permission: 'analytics:read' },
  { label: 'Notifications', to: '/app/notifications', permission: 'notifications:read' },
  { label: 'Profile', to: '/app/profile', permission: 'profile:read' },
];

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={collapsed ? 'w-16' : 'w-64'}>
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link to="/app" className="font-display font-semibold">
            {collapsed ? 'A' : 'Atrium'}
          </Link>
          <Button variant="ghost" size="sm" onClick={toggleSidebar} aria-label="Toggle sidebar">
            {collapsed ? '→' : '←'}
          </Button>
        </div>
        <nav className="space-y-1 p-3">
          {navigation.map((item) => {
            if (item.permission !== null && !user?.permissions.includes(item.permission)) {
              return null;
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm ${isActive ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted/50'}`
                }
              >
                {collapsed ? item.label.charAt(0) : item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b px-6">
          <div className="text-sm text-muted-foreground">{location.pathname}</div>
          <div className="flex items-center gap-3">
            {user?.permissions.includes('notifications:read') === true ? (
              <NotificationBell />
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </Button>
            <div className="text-sm">{user?.name}</div>
            <Button variant="ghost" size="sm" onClick={() => void clearSession()}>
              Sign out
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
