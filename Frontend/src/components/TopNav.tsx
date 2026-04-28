"use client";

import { useState, useCallback, useEffect } from "react";
import { Bell, X, User, Settings, LogOut, ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { getRecentSmsLogs } from "@/lib/sms-api";

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  type: "success" | "warning" | "error";
  unread: boolean;
}

function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " yr ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " day ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hr ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " min ago";
  return Math.floor(seconds) + " sec ago";
}

const typeColors: Record<string, string> = {
  error: "bg-red-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
};

interface TopNavProps {
  onNavigate?: (section: string) => void;
  sidebarWidth?: number;
  onMobileMenuToggle?: () => void;
}

export default function TopNav({
  onNavigate,
  sidebarWidth = 240,
  onMobileMenuToggle,
}: TopNavProps) {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const logs = await getRecentSmsLogs();
      const mapped: Notification[] = logs.map(log => ({
        id: log.id,
        title: log.sms_status === 'Sent' ? 'SMS Sent Successfully' : 'SMS Delivery Failed',
        message: `Plate: ${log.plate_number} — ${log.customer_name} (${log.last_sms_type})`,
        time: timeAgo(log.sms_sent_at),
        type: log.sms_status === 'Sent' ? 'success' : 'error',
        unread: false, // For now, we don't have per-user unread state in DB
      }));
      setNotifications(mapped);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  // Fetch on mount and set up polling
  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }, []);

  const dismissNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center justify-between h-16 bg-card border-b border-border px-4 sm:px-6 gap-4 left-0 md:left-[var(--sidebar-width)]"
      style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
    >
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden text-muted-foreground hover:text-foreground"
        onClick={onMobileMenuToggle}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </Button>

      {/* ── Right controls ── */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative text-muted-foreground hover:text-foreground hover:bg-accent"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="animate-pulse-dot absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-card" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-95 p-0 shadow-xl"
            sideOffset={8}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-5 px-1.5 text-[0.65rem]"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="divide-y divide-border max-h-72 overflow-y-auto">
              {notifications.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No notifications
                </div>
              )}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-3 p-4 hover:bg-muted/50 transition-colors group relative",
                    n.unread && "bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 shrink-0 w-2 h-2 rounded-full",
                      typeColors[n.type],
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-xs text-foreground">
                        {n.title}
                      </p>
                      {n.unread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-[0.65rem] text-muted-foreground/60 mt-1">
                      {n.time}
                    </p>
                  </div>
                  <button
                    onClick={() => dismissNotification(n.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <Separator />
            <button className="w-full py-2.5 text-xs text-primary font-semibold hover:bg-primary/5 transition-colors rounded-b-lg">
              View all notifications
            </button>
          </PopoverContent>
        </Popover>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 pl-2 pr-3 h-9 border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <Avatar className="w-6 h-6">
                <AvatarFallback className="bg-linear-to-br from-odg-orange to-odg-orange-dark text-white text-[0.6rem] font-bold">
                  {user?.initials || "AD"}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden xs:block">
                <div className="text-xs font-semibold leading-tight">
                  {user?.name?.split(" ")[0] || "Admin"}
                </div>
                <div className="text-[0.6rem] text-muted-foreground leading-tight">
                  {user?.role || "Admin"}
                </div>
              </div>
              <ChevronDown size={12} className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 shadow-xl"
            sideOffset={8}
          >
            <DropdownMenuLabel className="pb-1">
              <div className="font-semibold text-sm">
                {user?.name || "System Administrator"}
              </div>
              <div className="text-xs text-muted-foreground font-normal">
                {user?.email || "admin@odg.com.gh"}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onNavigate?.("profile")}
              className="cursor-pointer gap-2 text-sm"
            >
              <User size={14} /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onNavigate?.("settings")}
              className="cursor-pointer gap-2 text-sm"
            >
              <Settings size={14} /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-sm text-destructive focus:text-destructive focus:bg-destructive/10"
              onClick={() => logout()}
            >
              <LogOut size={14} /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
