"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";
import KPICards from "@/components/KPICards";
import BulkUpload from "@/components/BulkUpload";
import SubscriptionTable from "@/components/SubscriptionTable";
import RevenueChart from "@/components/RevenueChart";
import CustomersView from "@/components/CustomersView";
import VehiclesView from "@/components/VehiclesView";
import SubscriptionsView from "@/components/SubscriptionsView";
import RemovedView from "@/components/RemovedView";
import ProfileView from "@/components/ProfileView";
import SettingsView from "@/components/SettingsView";
import { Activity, Clock } from "lucide-react";

const SIDEBAR_COLLAPSED_WIDTH = 68;
const SIDEBAR_EXPANDED_WIDTH = 240;

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Derive current sidebar width for content offset
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

  const now = new Date();
  const timeString = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateString = now.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={(section) => {
          setActiveSection(section);
          // detect sidebar collapse state via MutationObserver approach is complex;
          // instead derive from sidebar DOM width  — simplify by passing a callback
        }}
      />

      {/* Main area */}
      <div
        className="flex flex-col min-h-screen transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Top Nav */}
        <TopNav
          onNavigate={setActiveSection}
          sidebarWidth={sidebarWidth}
        />

        {/* Page content — pushed below fixed header */}
        <main className="flex-1 pt-16 p-6 space-y-6">
          {/* ── Dashboard ──────────────────────────────────────────────────── */}
          {activeSection === "dashboard" && (
            <div className="space-y-6">
              {/* Welcome header */}
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                    Dashboard Overview
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Welcome back, Admin. Here&apos;s your billing &amp; compliance summary.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
                  <Clock size={13} />
                  <span className="font-medium">{timeString}</span>
                  <span>·</span>
                  <span>{dateString}</span>
                </div>
              </div>

              {/* KPIs */}
              <KPICards />

              {/* Chart + quick stats row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <RevenueChart />
                </div>
                {/* Quick overview panel */}
                <div className="flex flex-col gap-3">
                  <QuickStatCard
                    label="Vehicles Synced"
                    value="10 / 12"
                    sub="83% Trakzee sync rate"
                    color="text-blue-600"
                    bg="bg-blue-50"
                  />
                  <QuickStatCard
                    label="Overdue Accounts"
                    value="3"
                    sub="Immediate action required"
                    color="text-red-500"
                    bg="bg-red-50"
                  />
                  <QuickStatCard
                    label="Renewals This Week"
                    value="5"
                    sub="Due within 7 days"
                    color="text-amber-600"
                    bg="bg-amber-50"
                  />
                </div>
              </div>

              {/* Subscription table */}
              <SubscriptionTable />
            </div>
          )}

          {/* ── Customers ──────────────────────────────────────────────────── */}
          {activeSection === "customers" && <CustomersView />}

          {/* ── Vehicles ───────────────────────────────────────────────────── */}
          {activeSection === "vehicles" && <VehiclesView />}

          {/* ── Subscriptions ──────────────────────────────────────────────── */}
          {activeSection === "subscriptions" && <SubscriptionsView />}

          {/* ── Removed List ───────────────────────────────────────────────── */}
          {activeSection === "removed" && <RemovedView />}

          {/* ── Bulk Import ────────────────────────────────────────────────── */}
          {activeSection === "bulk-import" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                  Bulk Data Import
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Upload CSV files to import customer and vehicle data in bulk.
                </p>
              </div>
              <BulkUpload />
            </div>
          )}

          {/* ── Profile ────────────────────────────────────────────────────── */}
          {activeSection === "profile" && <ProfileView />}

          {/* ── Settings ───────────────────────────────────────────────────── */}
          {activeSection === "settings" && <SettingsView />}
        </main>

        {/* Footer */}
        <footer className="border-t border-border px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Activity size={12} className="text-primary" />
            <span className="font-semibold text-foreground">ODCMS</span>
            <span>· Office Data Client Management System</span>
          </div>
          <span>© {now.getFullYear()} Office Data Group — All rights reserved</span>
        </footer>
      </div>
    </div>
  );
}

// ── Helper component ─────────────────────────────────────────────────────────
function QuickStatCard({
  label, value, sub, color, bg,
}: {
  label: string; value: string; sub: string; color: string; bg: string;
}) {
  return (
    <div className={`rounded-xl border border-border p-4 flex items-center gap-4 bg-card hover:shadow-sm transition-shadow`}>
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
        <span className={`text-base font-extrabold ${color}`}>{value.split(" ")[0]}</span>
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-[0.7rem] text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
