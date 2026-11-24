import { create } from 'zustand';

import { setAccessToken } from '@/lib/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  status: 'pending_verification' | 'active' | 'suspended';
  roles: Array<{ slug: string; name: string }>;
  permissions: string[];
  emailVerified: boolean;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  setSession: (accessToken: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
  setStatus: (status: AuthState['status']) => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  status: 'idle',
  setSession: (accessToken, user) => {
    setAccessToken(accessToken);
    set({ accessToken, user, status: 'authenticated' });
  },
  setUser: (user) => set({ user }),
  clearSession: () => {
    setAccessToken(null);
    set({ accessToken: null, user: null, status: 'unauthenticated' });
  },
  setStatus: (status) => set({ status }),
  hasPermission: (permission) => get().user?.permissions.includes(permission) ?? false,
}));
