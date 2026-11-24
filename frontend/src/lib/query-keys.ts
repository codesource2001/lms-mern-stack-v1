export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  courses: {
    all: ['courses'] as const,
    list: (filters: Record<string, unknown>) => ['courses', 'list', filters] as const,
    detail: (id: string) => ['courses', 'detail', id] as const,
  },
} as const;
