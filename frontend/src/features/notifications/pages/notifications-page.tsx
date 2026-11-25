import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useForm } from 'react-hook-form';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchNotifications,
  fetchPreferences,
  markAllNotificationsRead,
  markNotificationRead,
  updatePreferences,
  type NotificationCategory,
} from '@/features/notifications/api';
import { preferencesSchema, type PreferencesForm } from '@/features/notifications/schemas';
import { queryKeys } from '@/lib/query-keys';

const categories: Array<{ key: NotificationCategory; label: string; description: string }> = [
  { key: 'announcements', label: 'Announcements', description: 'Course updates from instructors' },
  { key: 'deadlines', label: 'Deadlines', description: 'Assignment due-date reminders' },
  { key: 'grades', label: 'Grades', description: 'Results and feedback' },
  { key: 'system', label: 'System', description: 'Account and platform notices' },
];

const DEFAULT_PREFERENCES: PreferencesForm = {
  announcements: { inApp: true, email: false },
  deadlines: { inApp: true, email: true },
  grades: { inApp: true, email: true },
  system: { inApp: true, email: false },
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const unreadOnly = false;
  const page = 1;

  const listQuery = useQuery({
    queryKey: queryKeys.notifications.list({ unreadOnly, page }),
    queryFn: () => fetchNotifications({ unreadOnly, page }),
    refetchInterval: 60_000,
  });
  const preferencesQuery = useQuery({
    queryKey: queryKeys.notifications.preferences,
    queryFn: fetchPreferences,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
    ]);
  };

  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidate,
  });
  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
  });

  const form = useForm<PreferencesForm>({
    resolver: zodResolver(preferencesSchema),
    values: preferencesQuery.data ?? DEFAULT_PREFERENCES,
  });
  const savePreferences = useMutation({
    mutationFn: updatePreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.notifications.preferences, data);
      form.reset(data);
    },
  });

  const submitPreferences = form.handleSubmit((values) => {
    savePreferences.mutate(values);
  }) as (event: FormEvent<HTMLFormElement>) => void;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent activity and your delivery preferences.
        </p>
      </div>

      <section aria-labelledby="notification-list-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="notification-list-heading" className="font-display text-lg font-medium">
            Recent activity
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending || (listQuery.data?.items.length ?? 0) === 0}
          >
            Mark all as read
          </Button>
        </div>

        {listQuery.isPending ? (
          <div className="space-y-2" aria-label="Loading notifications">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : listQuery.isError ? (
          <div role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm">
            <p>{listQuery.error.message}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void listQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : listQuery.data.items.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            You have no notifications yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {listQuery.data.items.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.title}</p>
                        <Badge variant={item.readAt === null ? 'brand' : 'muted'}>
                          {item.readAt === null ? 'Unread' : 'Read'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.body}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                    </div>
                    {item.readAt === null ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markOne.mutate(item.id)}
                        disabled={markOne.isPending}
                      >
                        Mark read
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Choose which updates reach you in the app and by email.</CardDescription>
        </CardHeader>
        <CardContent>
          {preferencesQuery.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : preferencesQuery.isError ? (
            <div role="alert" className="text-sm text-destructive">
              {preferencesQuery.error.message}
              <Button
                variant="outline"
                size="sm"
                className="ml-3"
                onClick={() => void preferencesQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={submitPreferences}>
              {categories.map((category) => (
                <fieldset key={category.key} className="space-y-2">
                  <legend className="text-sm font-medium">{category.label}</legend>
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                  <div className="flex flex-wrap gap-5">
                    <div className="flex items-center gap-2">
                      <Input
                        id={`${category.key}-in-app`}
                        type="checkbox"
                        className="size-4"
                        {...form.register(`${category.key}.inApp`)}
                      />
                      <Label htmlFor={`${category.key}-in-app`}>In app</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`${category.key}-email`}
                        type="checkbox"
                        className="size-4"
                        {...form.register(`${category.key}.email`)}
                      />
                      <Label htmlFor={`${category.key}-email`}>Email</Label>
                    </div>
                  </div>
                </fieldset>
              ))}
              {savePreferences.isError ? (
                <p role="alert" className="text-sm text-destructive">
                  {savePreferences.error.message}
                </p>
              ) : null}
              <Button type="submit" disabled={savePreferences.isPending}>
                {savePreferences.isPending ? 'Saving…' : 'Save preferences'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
