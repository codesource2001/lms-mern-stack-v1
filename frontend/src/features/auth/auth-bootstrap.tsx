import { useEffect } from 'react';

import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthUser } from '@/stores/auth-store';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const setStatus = useAuthStore((state) => state.setStatus);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    let active = true;
    setStatus('loading');

    void (async () => {
      try {
        const response = await api.post('/auth/refresh');
        const data = response.data as unknown as {
          data?: { accessToken?: string; user?: AuthUser };
        };
        if (active && data.data?.accessToken && data.data.user) {
          setSession(data.data.accessToken, data.data.user);
          return;
        }
      } catch {
        // Fall through to unauthenticated.
      }

      if (active) {
        clearSession();
      }
    })();

    return () => {
      active = false;
    };
  }, [clearSession, setSession, setStatus]);

  return <>{children}</>;
}
