"use client";

import { useState, useCallback } from "react";
import { Search, Bell, X, User, Settings, LogOut, ChevronDown } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const mockNotifications = [
    {
        id: 1,
        title: "Trakzee Sync Failed",
        message: "API returned 503 for 3 vehicles. Retry scheduled.",
        time: "2 min ago",
        type: "error" as const,
        unread: true,
    },
    {
        id: 2,
        title: "Bulk Import Complete",
        message: "42 records imported successfully, 2 duplicates skipped.",
        time: "15 min ago",
        type: "success" as const,
        unread: true,
    },
    {
        id: 3,
        title: "Deactivation Warning",
        message: "17 vehicles pending deactivation due to overdue payments.",
        time: "1 hr ago",
        type: "warning" as const,
        unread: false,
    },
    {
        id: 4,
        title: "API Rate Limit",
        message: "Trakzee API rate limit approaching. 80% consumed.",
        time: "3 hr ago",
        type: "warning" as const,
        unread: false,
    },
];

const typeColors: Record<string, string> = {
    error: "bg-red-500",
    warning: "bg-amber-500",
    success: "bg-emerald-500",
};

interface TopNavProps {
    onNavigate?: (section: string) => void;
    sidebarWidth?: number;
}

export default function TopNav({ onNavigate, sidebarWidth = 240 }: TopNavProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [notifications, setNotifications] = useState(mockNotifications);

    const unreadCount = notifications.filter((n) => n.unread).length;

    const markAllRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    }, []);

    const dismissNotification = useCallback((id: number) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    return (
        <header
            className="fixed top-0 right-0 z-30 flex items-center justify-between h-16 bg-card border-b border-border px-6 gap-4"
            style={{ left: sidebarWidth, transition: "left 0.3s ease" }}
        >
            {/* ── Search ── */}
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                    type="text"
                    placeholder="Search customers, vehicles, IMEI…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-8 text-sm bg-muted/50 border-border focus-visible:ring-primary/30 h-9"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* ── Right controls ── */}
            <div className="flex items-center gap-2">

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
                    <PopoverContent align="end" className="w-[380px] p-0 shadow-xl" sideOffset={8}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">Notifications</span>
                                {unreadCount > 0 && (
                                    <Badge variant="destructive" className="h-5 px-1.5 text-[0.65rem]">
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
                                        n.unread && "bg-primary/5"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "mt-1.5 flex-shrink-0 w-2 h-2 rounded-full",
                                            typeColors[n.type]
                                        )}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                            <p className="font-semibold text-xs text-foreground">{n.title}</p>
                                            {n.unread && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                            {n.message}
                                        </p>
                                        <p className="text-[0.65rem] text-muted-foreground/60 mt-1">{n.time}</p>
                                    </div>
                                    <button
                                        onClick={() => dismissNotification(n.id)}
                                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
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
                                <AvatarFallback className="bg-gradient-to-br from-[#ED7D31] to-[#C9651B] text-white text-[0.6rem] font-bold">
                                    AD
                                </AvatarFallback>
                            </Avatar>
                            <div className="text-left hidden xs:block">
                                <div className="text-xs font-semibold leading-tight">Admin</div>
                                <div className="text-[0.6rem] text-muted-foreground leading-tight">ODG Master</div>
                            </div>
                            <ChevronDown size={12} className="text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 shadow-xl" sideOffset={8}>
                        <DropdownMenuLabel className="pb-1">
                            <div className="font-semibold text-sm">System Administrator</div>
                            <div className="text-xs text-muted-foreground font-normal">admin@odg.com.gh</div>
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
                            onClick={() => window.location.reload()}
                        >
                            <LogOut size={14} /> Sign Out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
