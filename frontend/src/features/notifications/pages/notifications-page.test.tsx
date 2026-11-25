import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NotificationsPage } from '@/features/notifications/pages/notifications-page';
import type { NotificationPage, NotificationPreferences } from '@/features/notifications/api';

const pageData: NotificationPage = {
  items: [
    {
      id: 'notification-1',
      category: 'deadlines',
      type: 'assignment_due',
      title: 'Assignment due: Final task',
      body: 'Submit your work before the deadline.',
      link: null,
      courseId: 'course-1',
      readAt: null,
      createdAt: '2026-11-25T10:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
};

const preferences: NotificationPreferences = {
  announcements: { inApp: true, email: false },
  deadlines: { inApp: true, email: true },
  grades: { inApp: true, email: true },
  system: { inApp: true, email: false },
};

vi.mock('@/features/notifications/api', () => ({
  fetchNotifications: vi.fn(() => Promise.resolve(pageData)),
  fetchPreferences: vi.fn(() => Promise.resolve(preferences)),
  fetchUnreadCount: vi.fn(() => Promise.resolve(1)),
  markNotificationRead: vi.fn(() => Promise.resolve()),
  markAllNotificationsRead: vi.fn(() => Promise.resolve(1)),
  updatePreferences: vi.fn((input: unknown) => Promise.resolve(input)),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NotificationsPage />
    </QueryClientProvider>,
  );
}

describe('NotificationsPage', () => {
  it('shows the notification list with unread state', async () => {
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: /notifications/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Assignment due: Final task')).toBeInTheDocument();
    expect(screen.getByText('Unread')).toBeInTheDocument();
  });

  it('renders preference controls for every notification category', async () => {
    renderPage();

    expect(await screen.findByText('Deadlines')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Email')).toHaveLength(4);
    expect(screen.getByRole('button', { name: /save preferences/i })).toBeInTheDocument();
  });
});
