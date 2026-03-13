"use client";

import { useState } from "react";
import Image from "next/image";
import {
    LayoutDashboard,
    Users,
    Car,
    CreditCard,
    ShieldOff,
    Upload,
    ChevronLeft,
    ChevronRight,
    History,
    Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    section?: "main" | "tools";
}

const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} />, section: "main" },
    { id: "customers", label: "Customers", icon: <Users size={20} />, section: "main" },
    { id: "vehicles", label: "Vehicles", icon: <Car size={20} />, section: "main" },
    { id: "subscriptions", label: "Subscriptions", icon: <CreditCard size={20} />, section: "main", badge: 3 },
    { id: "removed", label: "Removed List", icon: <ShieldOff size={20} />, section: "main" },
    { id: "payment-history", label: "Payment History", icon: <History size={20} />, section: "main" },
    { id: "inventory", label: "Inventory", icon: <Upload size={20} />, section: "main" },
    { id: "bulk-import", label: "Bulk Import", icon: <Upload size={20} />, section: "tools" },
];

interface SidebarProps {
    activeSection: string;
    onNavigate: (section: string) => void;
}

export default function Sidebar({ activeSection, onNavigate }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false);

    const mainItems = navItems.filter((n) => n.section === "main");
    const toolItems = navItems.filter((n) => n.section === "tools");

    const NavLink = ({ item }: { item: NavItem }) => {
        const isActive = activeSection === item.id;
        const btn = (
            <button
                onClick={() => onNavigate(item.id)}
                className={cn(
                    "w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group",
                    collapsed ? "justify-center px-0" : "px-3",
                    isActive
                        ? "bg-white text-odg-orange shadow-md shadow-black/20"
                        : "text-white/80 hover:bg-white/15 hover:text-white"
                )}
            >
                {/* Active indicator stripe */}
                {isActive && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-odg-orange rounded-r-full" />
                )}

                <span className="shrink-0">{item.icon}</span>

                {!collapsed && (
                    <>
                        <span className="flex-1 text-left leading-none">{item.label}</span>
                        {item.badge && (
                            <span className="ml-auto text-[0.65rem] font-bold bg-odg-orange text-white px-1.5 py-0.5 rounded-full leading-none">
                                {item.badge}
                            </span>
                        )}
                    </>
                )}

                {collapsed && item.badge && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white border border-sidebar" />
                )}
            </button>
        );

        if (collapsed) {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>{btn}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                        {item.label}
                        {item.badge && (
                            <span className="ml-1.5 text-[0.65rem] bg-orange-500 text-white px-1.5 py-0.5 rounded-full">
                                {item.badge}
                            </span>
                        )}
                    </TooltipContent>
                </Tooltip>
            );
        }

        return btn;
    };

    return (
        <aside
            className="fixed top-0 left-0 z-40 flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out"
            style={{ width: collapsed ? 68 : 240 }}
        >
            {/* ── Logo ── */}
            <div
                className={cn(
                    "flex items-center gap-3 border-b border-sidebar-border",
                    collapsed ? "px-3 py-4 justify-center" : "px-4 py-4"
                )}
            >
                <div className="shrink-0 w-9 h-9 rounded-lg overflow-hidden">
                    <Image src="/favicon.png" alt="ODG Logo" width={36} height={36} className="w-full h-full object-contain" />
                </div>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <div className="font-extrabold text-[0.95rem] text-white leading-tight tracking-tight">
                            ODCMS
                        </div>
                        <div className="text-[0.6rem] text-white/60 font-medium tracking-widest uppercase">
                            ODG Master Authority
                        </div>
                    </div>
                )}
            </div>

            {/* ── Navigation ── */}
            <nav className="flex-1 overflow-y-auto py-4 px-2 flex flex-col gap-0.5">
                {!collapsed && (
                    <p className="px-2 mb-2 text-[0.6rem] font-semibold uppercase tracking-widest text-white/50">
                        Main
                    </p>
                )}
                {mainItems.map((item) => (
                    <NavLink key={item.id} item={item} />
                ))}

                <Separator className="my-3 bg-sidebar-border" />

                {!collapsed && (
                    <p className="px-2 mb-2 text-[0.6rem] font-semibold uppercase tracking-widest text-white/50">
                        Tools
                    </p>
                )}
                {toolItems.map((item) => (
                    <NavLink key={item.id} item={item} />
                ))}
            </nav>

            {/* ── Collapse Toggle ── */}
            <div className="border-t border-sidebar-border p-2">
                {collapsed ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setCollapsed(false)}
                                className="w-full flex items-center justify-center py-2.5 rounded-lg bg-white/20 hover:bg-white/35 text-white transition-all duration-200 shadow-sm"
                            >
                                <ChevronRight size={18} strokeWidth={2.5} />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">Expand sidebar</TooltipContent>
                    </Tooltip>
                ) : (
                    <button
                        onClick={() => setCollapsed(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:bg-white/15 hover:text-white text-xs font-medium transition-all duration-200"
                    >
                        <ChevronLeft size={16} />
                        <span>Collapse</span>
                    </button>
                )}
            </div>
        </aside>
    );
}
