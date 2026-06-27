"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = () => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setNotifications(d.data.notifications);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    fetchNotifications();
  };

  const typeIcon = (type: string) => {
    const colors: Record<string, string> = {
      BOTTLE_ACCEPTED: "bg-primary/20 text-primary",
      REWARD_CLAIMED: "bg-blue-500/20 text-blue-400",
      ACHIEVEMENT_UNLOCKED: "bg-yellow-500/20 text-yellow-400",
      MACHINE_OFFLINE: "bg-destructive/20 text-destructive",
      STORAGE_FULL: "bg-orange-500/20 text-orange-400",
      SENSOR_ERROR: "bg-red-500/20 text-red-400",
    };
    return colors[type] ?? "bg-muted/20 text-muted-foreground";
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Stay updated on your activity</p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1">
          <CheckCheck size={14} />
          Mark all read
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={n.isRead ? "opacity-60" : "border-primary/20"}
            >
              <CardContent className="flex gap-4 p-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${typeIcon(n.type)}`}
                >
                  <Bell size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          {!notifications.length && (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Bell size={48} className="mb-4 opacity-30" />
              <p>No notifications yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
