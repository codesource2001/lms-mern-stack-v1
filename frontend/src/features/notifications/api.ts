import { api } from '@/lib/api';

export type NotificationCategory = 'announcements' | 'deadlines' | 'grades' | 'system';
export type NotificationType =
  'course_announcement' | 'assignment_due' | 'quiz_reminder' | 'grade_posted' | 'system';

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  courseId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  items: NotificationItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ChannelPreference {
  inApp: boolean;
  email: boolean;
}

export interface NotificationPreferences {
  announcements: ChannelPreference;
  deadlines: ChannelPreference;
  grades: ChannelPreference;
  system: ChannelPreference;
}

interface Envelope<TData, TMeta = undefined> {
  data: TData;
  meta?: TMeta;
}

export async function fetchNotifications(input: {
  unreadOnly: boolean;
  page: number;
}): Promise<NotificationPage> {
  const response = await api.get<Envelope<{ items: NotificationItem[] }, NotificationPage>>(
    '/notifications',
    { params: { unreadOnly: input.unreadOnly ? 'true' : 'false', page: input.page } },
  );
  const meta = response.data.meta;

  return {
    items: response.data.data.items,
    total: meta?.total ?? 0,
    page: meta?.page ?? input.page,
    limit: meta?.limit ?? 20,
  };
}

export async function fetchUnreadCount(): Promise<number> {
  const response = await api.get<Envelope<{ count: number }>>('/notifications/unread-count');
  return response.data.data.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await api.post<Envelope<{ updated: number }>>('/notifications/read-all');
  return response.data.data.updated;
}

export async function fetchPreferences(): Promise<NotificationPreferences> {
  const response = await api.get<Envelope<{ preferences: NotificationPreferences }>>(
    '/notifications/preferences',
  );
  return response.data.data.preferences;
}

export async function updatePreferences(
  input: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const response = await api.patch<Envelope<{ preferences: NotificationPreferences }>>(
    '/notifications/preferences',
    input,
  );
  return response.data.data.preferences;
}
