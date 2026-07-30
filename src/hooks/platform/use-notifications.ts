"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PlatformNotificationItem } from "@/components/platform/notifications/notification-list";

export type NotificationsQueryData = {
  items: PlatformNotificationItem[];
  unread: number;
  total?: number;
};

export function useNotifications(config: {
  queryKey: readonly unknown[];
  fetchNotifications: () => Promise<NotificationsQueryData>;
  markRead: (id: string) => Promise<{ ok: boolean } | void>;
  markAllRead?: () => Promise<{ ok: boolean } | void>;
}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: config.queryKey,
    queryFn: config.fetchNotifications,
  });

  const markReadMutation = useMutation({
    mutationFn: config.markRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: config.markAllRead ?? (async () => ({ ok: true })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
  });

  return {
    ...query,
    markRead: markReadMutation.mutateAsync,
    markAllRead: config.markAllRead ? markAllReadMutation.mutateAsync : undefined,
    isMarkingRead: markReadMutation.isPending || markAllReadMutation.isPending,
  };
}
