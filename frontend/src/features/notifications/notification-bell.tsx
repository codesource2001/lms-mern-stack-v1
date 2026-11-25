import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Link } from 'react-router';

import { Badge } from '@/components/ui/badge';
import { fetchUnreadCount } from '@/features/notifications/api';
import { queryKeys } from '@/lib/query-keys';

export function NotificationBell() {
  const { data: count } = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
  });

  const label = count === undefined ? 'Notifications' : `Notifications, ${count} unread`;

  return (
    <Link
      to="/app/notifications"
      className="relative inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label={label}
    >
      <Bell aria-hidden="true" className="size-4" />
      {count !== undefined && count > 0 ? (
        <Badge variant="brand" aria-hidden="true">
          {count > 99 ? '99+' : count}
        </Badge>
      ) : null}
    </Link>
  );
}
