"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

export type DashboardNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};

type NotificationUpdater = (
  updater: (current: DashboardNotification[]) => DashboardNotification[],
) => void;

export function useNotifications() {
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setNotifications(data.notifications);
  }, []);

  const updateNotifications: NotificationUpdater = useCallback((updater) => {
    setNotifications(updater);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial notification hydration intentionally happens after mount.
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refresh]);

  return { notifications, refresh, updateNotifications };
}

export function DashboardNotifications({
  notifications,
  refresh,
  updateNotifications,
}: {
  notifications: DashboardNotification[];
  refresh: () => Promise<void>;
  updateNotifications: NotificationUpdater;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const unread = notifications.filter((item) => !item.readAt).length;

  async function action(
    method: "PATCH" | "DELETE",
    body: { action?: "READ" | "READ_ALL"; id?: string },
  ) {
    if (busy) return;
    const previous = notifications;
    const now = new Date().toISOString();
    setBusy(true);
    updateNotifications((current) => {
      if (method === "DELETE")
        return body.id ? current.filter((item) => item.id !== body.id) : [];
      if (body.action === "READ_ALL")
        return current.map((item) => ({ ...item, readAt: item.readAt || now }));
      return current.map((item) =>
        item.id === body.id ? { ...item, readAt: item.readAt || now } : item,
      );
    });

    try {
      const response = await fetch("/api/notifications", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Notification update failed");
      await refresh();
    } catch {
      updateNotifications(() => previous);
      toast.error("Notifications could not be updated. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dashboard-notifications">
      <button
        className="dashboard-bell"
        type="button"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={18} />
        {unread > 0 && <span>{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="dashboard-notification-popover" role="dialog" aria-label="Notifications">
          <div className="dashboard-notification-heading">
            <div>
              <b>Notifications</b>
              <small>{unread ? `${unread} unread` : "All caught up"}</small>
            </div>
            <button type="button" aria-label="Close notifications" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="dashboard-notification-actions">
            <button
              type="button"
              disabled={!unread || busy}
              onClick={() => action("PATCH", { action: "READ_ALL" })}
            >
              <CheckCheck size={14} />
              Mark all as read
            </button>
            <button
              type="button"
              disabled={!notifications.length || busy}
              onClick={() => action("DELETE", {})}
            >
              <Trash2 size={14} />
              Clear all
            </button>
          </div>
          <div className="dashboard-notification-list">
            {notifications.length ? (
              notifications.map((item) => (
                <div
                  className={`dashboard-notification${item.readAt ? " is-read" : ""}`}
                  key={item.id}
                >
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (!item.readAt) void action("PATCH", { action: "READ", id: item.id });
                      setOpen(false);
                    }}
                  >
                    <b>{item.title}</b>
                    <span>{item.message}</span>
                    <small>{new Date(item.createdAt).toLocaleString("en-NA")}</small>
                  </Link>
                  <button
                    type="button"
                    aria-label={`Delete ${item.title}`}
                    disabled={busy}
                    onClick={() => action("DELETE", { id: item.id })}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <p className="dashboard-notification-empty">No notifications yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
