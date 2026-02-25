"use client";

import { useState } from "react";
import {
    CreditCard,
    Power,
    ChevronDown,
    ChevronUp,
    Filter,
    Download,
} from "lucide-react";
import { subscriptions, Subscription, SubscriptionStatus } from "@/data/dummy";

const statusBadgeClass: Record<SubscriptionStatus, string> = {
    Active: "badge-active",
    "Due Soon": "badge-due-soon",
    Overdue: "badge-overdue",
    Suspended: "badge-suspended",
};

type SortField = "customerName" | "expiryDate" | "status";
type SortDir = "asc" | "desc";

export default function SubscriptionTable() {
    const [filter, setFilter] = useState<SubscriptionStatus | "All">("All");
    const [sortField, setSortField] = useState<SortField>("expiryDate");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [actionDone, setActionDone] = useState<Record<string, string>>({});

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDir("asc");
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ChevronDown size={12} style={{ opacity: 0.3 }} />;
        return sortDir === "asc" ? (
            <ChevronUp size={12} color="#ED7D31" />
        ) : (
            <ChevronDown size={12} color="#ED7D31" />
        );
    };

    const filtered = subscriptions
        .filter((s) => filter === "All" || s.status === filter)
        .sort((a, b) => {
            let cmp = 0;
            if (sortField === "customerName") cmp = a.customerName.localeCompare(b.customerName);
            if (sortField === "expiryDate") cmp = a.expiryDate.localeCompare(b.expiryDate);
            if (sortField === "status") cmp = a.status.localeCompare(b.status);
            return sortDir === "asc" ? cmp : -cmp;
        });

    const handlePayment = (sub: Subscription) => {
        setActionDone((prev) => ({ ...prev, [sub.id]: "paid" }));
        setTimeout(() => {
            setActionDone((prev) => {
                const next = { ...prev };
                delete next[sub.id];
                return next;
            });
        }, 2000);
    };

    const handleDeactivate = (sub: Subscription) => {
        setActionDone((prev) => ({ ...prev, [sub.id]: "deactivated" }));
        setTimeout(() => {
            setActionDone((prev) => {
                const next = { ...prev };
                delete next[sub.id];
                return next;
            });
        }, 2000);
    };

    const statusCounts = {
        All: subscriptions.length,
        Active: subscriptions.filter((s) => s.status === "Active").length,
        "Due Soon": subscriptions.filter((s) => s.status === "Due Soon").length,
        Overdue: subscriptions.filter((s) => s.status === "Overdue").length,
        Suspended: subscriptions.filter((s) => s.status === "Suspended").length,
    };

    return (
        <div className="card" style={{ overflow: "hidden" }}>
            {/* Header */}
            <div
                style={{
                    padding: "1.25rem 1.5rem",
                    borderBottom: "1px solid #E4E4E7",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                }}
            >
                <div>
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1A1A2E" }}>
                        Due Subscriptions
                    </h2>
                    <p style={{ fontSize: "0.8125rem", color: "#71717A", marginTop: "0.125rem" }}>
                        {filtered.length} subscriptions found
                    </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <button className="btn-secondary">
                        <Download size={14} /> Export
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div
                style={{
                    padding: "0.75rem 1.5rem",
                    borderBottom: "1px solid #E4E4E7",
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    overflowX: "auto",
                }}
            >
                <Filter size={14} color="#A1A1AA" />
                {(["All", "Active", "Due Soon", "Overdue", "Suspended"] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        style={{
                            padding: "0.375rem 0.75rem",
                            borderRadius: "0.375rem",
                            border: "1px solid",
                            borderColor: filter === s ? "#ED7D31" : "#E4E4E7",
                            background: filter === s ? "#FFF5EC" : "white",
                            color: filter === s ? "#ED7D31" : "#71717A",
                            fontWeight: filter === s ? 600 : 500,
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            whiteSpace: "nowrap",
                            fontFamily: "inherit",
                        }}
                    >
                        {s}
                        <span
                            style={{
                                marginLeft: 4,
                                fontSize: "0.65rem",
                                opacity: 0.6,
                            }}
                        >
                            ({statusCounts[s]})
                        </span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                    <thead>
                        <tr style={{ background: "#FAFAFA" }}>
                            <th
                                onClick={() => handleSort("customerName")}
                                style={{
                                    padding: "0.75rem 1rem",
                                    textAlign: "left",
                                    fontWeight: 600,
                                    color: "#52525B",
                                    fontSize: "0.7rem",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    borderBottom: "1px solid #E4E4E7",
                                    cursor: "pointer",
                                    userSelect: "none",
                                }}
                            >
                                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                    Customer Info <SortIcon field="customerName" />
                                </span>
                            </th>
                            <th
                                style={{
                                    padding: "0.75rem 1rem",
                                    textAlign: "left",
                                    fontWeight: 600,
                                    color: "#52525B",
                                    fontSize: "0.7rem",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    borderBottom: "1px solid #E4E4E7",
                                }}
                            >
                                Vehicle
                            </th>
                            <th
                                onClick={() => handleSort("expiryDate")}
                                style={{
                                    padding: "0.75rem 1rem",
                                    textAlign: "left",
                                    fontWeight: 600,
                                    color: "#52525B",
                                    fontSize: "0.7rem",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    borderBottom: "1px solid #E4E4E7",
                                    cursor: "pointer",
                                    userSelect: "none",
                                }}
                            >
                                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                    Expiry & Status <SortIcon field="expiryDate" />
                                </span>
                            </th>
                            <th
                                style={{
                                    padding: "0.75rem 1rem",
                                    textAlign: "left",
                                    fontWeight: 600,
                                    color: "#52525B",
                                    fontSize: "0.7rem",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    borderBottom: "1px solid #E4E4E7",
                                }}
                            >
                                Trakzee Sync
                            </th>
                            <th
                                style={{
                                    padding: "0.75rem 1rem",
                                    textAlign: "left",
                                    fontWeight: 600,
                                    color: "#52525B",
                                    fontSize: "0.7rem",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    borderBottom: "1px solid #E4E4E7",
                                }}
                            >
                                Plan
                            </th>
                            <th
                                style={{
                                    padding: "0.75rem 1rem",
                                    textAlign: "right",
                                    fontWeight: 600,
                                    color: "#52525B",
                                    fontSize: "0.7rem",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    borderBottom: "1px solid #E4E4E7",
                                }}
                            >
                                Action
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((sub) => (
                            <tr
                                key={sub.id}
                                style={{
                                    borderBottom: "1px solid #F4F4F5",
                                    transition: "background 0.15s ease",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAFA")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                                {/* Customer Info */}
                                <td style={{ padding: "0.75rem 1rem" }}>
                                    <div style={{ fontWeight: 600, color: "#1A1A2E", lineHeight: 1.3 }}>
                                        {sub.customerName}
                                    </div>
                                    <div style={{ fontSize: "0.75rem", color: "#A1A1AA", marginTop: 2 }}>
                                        {sub.phone}
                                    </div>
                                </td>

                                {/* Vehicle */}
                                <td style={{ padding: "0.75rem 1rem" }}>
                                    <div style={{ fontWeight: 600, color: "#1A1A2E", lineHeight: 1.3 }}>
                                        {sub.plateNumber}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "0.7rem",
                                            color: "#A1A1AA",
                                            fontFamily: "monospace",
                                            marginTop: 2,
                                        }}
                                    >
                                        {sub.imei}
                                    </div>
                                </td>

                                {/* Expiry & Status */}
                                <td style={{ padding: "0.75rem 1rem" }}>
                                    <div style={{ fontSize: "0.8125rem", color: "#3F3F46", marginBottom: 4 }}>
                                        {sub.expiryDate}
                                    </div>
                                    <span className={`badge ${statusBadgeClass[sub.status]}`}>
                                        <span
                                            style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: "50%",
                                                display: "inline-block",
                                                background: "currentColor",
                                            }}
                                        />
                                        {sub.status}
                                    </span>
                                </td>

                                {/* Trakzee Sync */}
                                <td style={{ padding: "0.75rem 1rem" }}>
                                    <span
                                        className={`badge ${sub.trakzeeStatus === "Active"
                                            ? "badge-trakzee-active"
                                            : "badge-trakzee-deactivated"
                                            }`}
                                    >
                                        {sub.trakzeeStatus}
                                    </span>
                                </td>

                                {/* Plan */}
                                <td style={{ padding: "0.75rem 1rem" }}>
                                    <span
                                        style={{
                                            padding: "0.2rem 0.5rem",
                                            borderRadius: 999,
                                            fontSize: "0.7rem",
                                            fontWeight: 600,
                                            background: "#FFF5EC",
                                            color: "#ED7D31",
                                        }}
                                    >
                                        {sub.plan}
                                    </span>
                                    <div style={{ fontSize: "0.7rem", color: "#A1A1AA", marginTop: 2 }}>
                                        GH₵{sub.monthlyAmount}/mo
                                    </div>
                                </td>

                                {/* Action */}
                                <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                                    {actionDone[sub.id] === "paid" ? (
                                        <span
                                            style={{
                                                fontSize: "0.75rem",
                                                fontWeight: 600,
                                                color: "#22C55E",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 4,
                                            }}
                                        >
                                            ✓ Payment Recorded
                                        </span>
                                    ) : actionDone[sub.id] === "deactivated" ? (
                                        <span
                                            style={{
                                                fontSize: "0.75rem",
                                                fontWeight: 600,
                                                color: "#EF4444",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 4,
                                            }}
                                        >
                                            ✓ Deactivated
                                        </span>
                                    ) : (
                                        <div style={{ display: "flex", gap: "0.375rem", justifyContent: "flex-end" }}>
                                            {sub.status !== "Suspended" && (
                                                <button
                                                    className="btn-primary"
                                                    onClick={() => handlePayment(sub)}
                                                    style={{ fontSize: "0.75rem", padding: "0.375rem 0.625rem" }}
                                                >
                                                    <CreditCard size={14} /> Pay
                                                </button>
                                            )}
                                            {(sub.status === "Overdue" || sub.status === "Suspended") && (
                                                <button
                                                    className="btn-danger"
                                                    onClick={() => handleDeactivate(sub)}
                                                    style={{ fontSize: "0.75rem", padding: "0.375rem 0.625rem" }}
                                                >
                                                    <Power size={14} /> Deactivate
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div
                style={{
                    padding: "0.75rem 1.5rem",
                    borderTop: "1px solid #E4E4E7",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.75rem",
                    color: "#71717A",
                }}
            >
                <span>
                    Showing {filtered.length} of {subscriptions.length} subscriptions
                </span>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                    {[1, 2, 3].map((p) => (
                        <button
                            key={p}
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: "0.375rem",
                                border: p === 1 ? "1px solid #ED7D31" : "1px solid #E4E4E7",
                                background: p === 1 ? "#FFF5EC" : "white",
                                color: p === 1 ? "#ED7D31" : "#71717A",
                                fontWeight: p === 1 ? 600 : 400,
                                fontSize: "0.75rem",
                                cursor: "pointer",
                                fontFamily: "inherit",
                            }}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
