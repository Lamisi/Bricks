"use client";

import { useEffect, useReducer, useTransition } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";
import { useRouter } from "@/lib/navigation";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

interface State {
  notifications: Notification[];
  loading: boolean;
}

type Action =
  | { type: "LOADED"; payload: Notification[] }
  | { type: "PREPEND"; payload: Notification }
  | { type: "MARK_READ"; id: string }
  | { type: "MARK_ALL_READ" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOADED":
      return { notifications: action.payload, loading: false };
    case "PREPEND":
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 20),
      };
    case "MARK_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.id ? { ...n, read_at: new Date().toISOString() } : n,
        ),
      };
    case "MARK_ALL_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) => ({
          ...n,
          read_at: n.read_at ?? new Date().toISOString(),
        })),
      };
    default:
      return state;
  }
}

export function NotificationBell({ userId }: { userId: string }) {
  const [state, dispatch] = useReducer(reducer, { notifications: [], loading: true });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const unreadCount = state.notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/notifications?limit=20");
      if (res.ok) {
        const data = await res.json();
        dispatch({ type: "LOADED", payload: data.notifications });
      }
    }
    load();

    // Subscribe to realtime inserts
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          dispatch({ type: "PREPEND", payload: payload.new as Notification });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  function handleClick(notification: Notification) {
    if (!notification.read_at) {
      dispatch({ type: "MARK_READ", id: notification.id });
      startTransition(async () => {
        await markNotificationRead(notification.id);
      });
    }
    if (notification.link) {
      router.push(notification.link);
    }
  }

  function handleMarkAll() {
    dispatch({ type: "MARK_ALL_READ" });
    startTransition(async () => {
      await markAllNotificationsRead();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              disabled={isPending}
              onClick={handleMarkAll}
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />

        {state.loading ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">Loading…</div>
        ) : state.notifications.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          state.notifications.slice(0, 10).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex flex-col items-start gap-0.5 px-3 py-2.5 cursor-pointer"
              onClick={() => handleClick(n)}
            >
              <div className="flex w-full items-start gap-2">
                {!n.read_at && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${n.read_at ? "text-muted-foreground" : "font-medium"}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</p>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground self-end">
                {new Date(n.created_at).toLocaleString()}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
