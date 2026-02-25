"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Bell, User, Settings, LogOut, X } from "lucide-react";

const mockNotifications = [
    {
        id: 1,
        title: "Trakzee Sync Failed",
        message: "API returned 503 for 3 vehicles. Retry scheduled.",
        time: "2 min ago",
        type: "error" as const,
    },
    {
        id: 2,
        title: "Bulk Import Complete",
        message: "42 records imported successfully, 2 duplicates skipped.",
        time: "15 min ago",
        type: "success" as const,
    },
    {
        id: 3,
        title: "Deactivation Warning",
        message: "17 vehicles pending deactivation due to overdue payments.",
        time: "1 hr ago",
        type: "warning" as const,
    },
    {
        id: 4,
        title: "API Rate Limit",
        message: "Trakzee API rate limit approaching. 80% consumed.",
        time: "3 hr ago",
        type: "warning" as const,
    },
];

interface TopNavProps {
    onNavigate?: (section: string) => void;
}

export default function TopNav({ onNavigate }: TopNavProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setShowProfile(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header
            style={{
                height: 64,
                background: "white",
                borderBottom: "1px solid #E4E4E7",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 1.5rem",
                position: "sticky",
                top: 0,
                zIndex: 30,
            }}
        >
            {/* Search */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    background: "#F4F4F5",
                    borderRadius: "0.5rem",
                    padding: "0.5rem 0.75rem",
                    width: "100%",
                    maxWidth: 420,
                    border: "1px solid transparent",
                    transition: "border-color 0.2s ease",
                }}
            >
                <Search size={18} color="#A1A1AA" />
                <input
                    type="text"
                    placeholder="Search customers, vehicles, IMEI…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        border: "none",
                        background: "transparent",
                        outline: "none",
                        fontSize: "0.875rem",
                        color: "#1A1A2E",
                        width: "100%",
                        fontFamily: "inherit",
                    }}
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery("")}
                        style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}
                    >
                        <X size={14} color="#A1A1AA" />
                    </button>
                )}
            </div>

            {/* Right side */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {/* Notifications */}
                <div ref={notifRef} style={{ position: "relative" }}>
                    <button
                        onClick={() => {
                            setShowNotifications(!showNotifications);
                            setShowProfile(false);
                        }}
                        style={{
                            position: "relative",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 40,
                            height: 40,
                            borderRadius: "0.5rem",
                            border: "none",
                            background: showNotifications ? "#FFF5EC" : "transparent",
                            cursor: "pointer",
                            transition: "background 0.2s ease",
                        }}
                    >
                        <Bell size={20} color={showNotifications ? "#ED7D31" : "#52525B"} />
                        <span
                            className="animate-pulse-dot"
                            style={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "#EF4444",
                                border: "2px solid white",
                            }}
                        />
                    </button>

                    {showNotifications && (
                        <div
                            style={{
                                position: "absolute",
                                right: 0,
                                top: "calc(100% + 8px)",
                                width: 380,
                                background: "white",
                                borderRadius: "0.75rem",
                                border: "1px solid #E4E4E7",
                                boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                                overflow: "hidden",
                                zIndex: 50,
                            }}
                        >
                            <div
                                style={{
                                    padding: "0.875rem 1rem",
                                    borderBottom: "1px solid #E4E4E7",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Notifications</span>
                                <span
                                    style={{
                                        fontSize: "0.7rem",
                                        background: "#EF4444",
                                        color: "white",
                                        padding: "2px 8px",
                                        borderRadius: 999,
                                        fontWeight: 600,
                                    }}
                                >
                                    {mockNotifications.length}
                                </span>
                            </div>
                            {mockNotifications.map((n) => (
                                <div
                                    key={n.id}
                                    style={{
                                        padding: "0.75rem 1rem",
                                        borderBottom: "1px solid #F4F4F5",
                                        cursor: "pointer",
                                        transition: "background 0.15s ease",
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.background = "#FAFAFA")
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.background = "transparent")
                                    }
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                                            <div
                                                style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: "50%",
                                                    marginTop: 6,
                                                    flexShrink: 0,
                                                    background:
                                                        n.type === "error"
                                                            ? "#EF4444"
                                                            : n.type === "warning"
                                                                ? "#F59E0B"
                                                                : "#22C55E",
                                                }}
                                            />
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: "0.8125rem", color: "#1A1A2E" }}>
                                                    {n.title}
                                                </div>
                                                <div style={{ fontSize: "0.75rem", color: "#71717A", marginTop: 2 }}>
                                                    {n.message}
                                                </div>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: "0.6875rem", color: "#A1A1AA", whiteSpace: "nowrap", marginLeft: 8 }}>
                                            {n.time}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div
                                style={{
                                    padding: "0.625rem 1rem",
                                    textAlign: "center",
                                    fontSize: "0.8125rem",
                                    color: "#ED7D31",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                View All Notifications
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile */}
                <div ref={profileRef} style={{ position: "relative" }}>
                    <button
                        onClick={() => {
                            setShowProfile(!showProfile);
                            setShowNotifications(false);
                        }}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.625rem",
                            padding: "0.375rem 0.75rem",
                            borderRadius: "0.5rem",
                            border: "1px solid #E4E4E7",
                            background: showProfile ? "#FFF5EC" : "white",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                        }}
                    >
                        <div
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #ED7D31, #F5A66A)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                            }}
                        >
                            AD
                        </div>
                        <div style={{ textAlign: "left" }}>
                            <div style={{ fontWeight: 600, fontSize: "0.8125rem", color: "#1A1A2E", lineHeight: 1.2 }}>
                                Admin
                            </div>
                            <div style={{ fontSize: "0.6875rem", color: "#A1A1AA", lineHeight: 1.2 }}>
                                admin@odcms.com.gh
                            </div>
                        </div>
                    </button>

                    {showProfile && (
                        <div
                            style={{
                                position: "absolute",
                                right: 0,
                                top: "calc(100% + 8px)",
                                width: 200,
                                background: "white",
                                borderRadius: "0.75rem",
                                border: "1px solid #E4E4E7",
                                boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                                overflow: "hidden",
                                zIndex: 50,
                            }}
                        >
                            <button
                                onClick={() => {
                                    if (onNavigate) onNavigate("profile");
                                    setShowProfile(false);
                                }}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    width: "100%",
                                    padding: "0.625rem 1rem",
                                    border: "none",
                                    background: "transparent",
                                    fontSize: "0.8125rem",
                                    color: "#3F3F46",
                                    cursor: "pointer",
                                    transition: "background 0.15s ease",
                                    fontFamily: "inherit",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#F4F4F5")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                                <User size={16} /> Profile
                            </button>
                            <button
                                onClick={() => {
                                    if (onNavigate) onNavigate("settings");
                                    setShowProfile(false);
                                }}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    width: "100%",
                                    padding: "0.625rem 1rem",
                                    border: "none",
                                    background: "transparent",
                                    fontSize: "0.8125rem",
                                    color: "#3F3F46",
                                    cursor: "pointer",
                                    transition: "background 0.15s ease",
                                    fontFamily: "inherit",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#F4F4F5")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                                <Settings size={16} /> Settings
                            </button>
                            <div style={{ height: 1, background: "#E4E4E7" }} />
                            <button
                                onClick={() => {
                                    alert("Signed out successfully!");
                                    setShowProfile(false);
                                    window.location.reload();
                                }}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    width: "100%",
                                    padding: "0.625rem 1rem",
                                    border: "none",
                                    background: "transparent",
                                    fontSize: "0.8125rem",
                                    color: "#EF4444",
                                    cursor: "pointer",
                                    transition: "background 0.15s ease",
                                    fontFamily: "inherit",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF2F2")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                                <LogOut size={16} /> Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
