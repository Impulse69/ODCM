"use client";

import { useState } from "react";
import {
    LayoutDashboard,
    Users,
    Car,
    CreditCard,
    ShieldOff,
    Upload,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
}

const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "customers", label: "Customers", icon: <Users size={20} /> },
    { id: "vehicles", label: "Vehicles", icon: <Car size={20} /> },
    { id: "subscriptions", label: "Subscriptions", icon: <CreditCard size={20} /> },
    { id: "removed", label: "Removed List", icon: <ShieldOff size={20} /> },
    { id: "bulk-import", label: "Bulk Import", icon: <Upload size={20} /> },
];

interface SidebarProps {
    activeSection: string;
    onNavigate: (section: string) => void;
}

export default function Sidebar({ activeSection, onNavigate }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            style={{
                width: collapsed ? "72px" : "256px",
                minHeight: "100vh",
                background: "#1A1A2E",
                padding: collapsed ? "1.25rem 0.625rem" : "1.25rem 1rem",
                display: "flex",
                flexDirection: "column",
                transition: "width 0.3s ease, padding 0.3s ease",
                position: "fixed",
                top: 0,
                left: 0,
                zIndex: 40,
                borderRight: "1px solid rgba(255,255,255,0.06)",
            }}
        >
            {/* Logo */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: collapsed ? "0 0.25rem" : "0 0.5rem",
                    marginBottom: "2rem",
                }}
            >
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: "0.5rem",
                        background: "linear-gradient(135deg, #ED7D31, #F5A66A)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "1rem",
                        color: "white",
                        flexShrink: 0,
                    }}
                >
                    O
                </div>
                {!collapsed && (
                    <div style={{ overflow: "hidden" }}>
                        <div
                            style={{
                                fontWeight: 700,
                                fontSize: "1.05rem",
                                color: "white",
                                letterSpacing: "-0.01em",
                                lineHeight: 1.2,
                            }}
                        >
                            ODCMS
                        </div>
                        <div
                            style={{
                                fontSize: "0.65rem",
                                color: "#A1A1AA",
                                fontWeight: 500,
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                            }}
                        >
                            Master Authority
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`sidebar-link ${activeSection === item.id ? "active" : ""}`}
                        title={collapsed ? item.label : ""}
                        style={{ justifyContent: collapsed ? "center" : "flex-start" }}
                    >
                        <span style={{ flexShrink: 0 }}>{item.icon}</span>
                        {!collapsed && <span>{item.label}</span>}
                    </button>
                ))}
            </nav>

            {/* Collapse Toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.5rem",
                    borderRadius: "0.5rem",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#A1A1AA",
                    cursor: "pointer",
                    fontSize: "0.8125rem",
                    transition: "all 0.2s ease",
                    marginTop: "auto",
                }}
            >
                {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                {!collapsed && <span>Collapse</span>}
            </button>
        </aside>
    );
}
