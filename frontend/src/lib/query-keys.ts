export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  courses: {
    all: ['courses'] as const,
    list: (filters: Record<string, unknown>) => ['courses', 'list', filters] as const,
    detail: (id: string) => ['courses', 'detail', id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (filters: { unreadOnly: boolean; page: number }) =>
      ['notifications', 'list', filters] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
    preferences: ['notifications', 'preferences'] as const,
  },
  analytics: {
    overview: ['analytics', 'overview'] as const,
  },
} as const;
