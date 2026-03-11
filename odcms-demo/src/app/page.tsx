"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";
import KPICards from "@/components/KPICards";
import BulkUpload from "@/components/BulkUpload";
import SubscriptionTable from "@/components/SubscriptionTable";
import CustomersView from "@/components/CustomersView";
import VehiclesView from "@/components/VehiclesView";
import SubscriptionsView from "@/components/SubscriptionsView";
import RemovedView from "@/components/RemovedView";
import PaymentHistoryView from "@/components/PaymentHistoryView";
import ProfileView from "@/components/ProfileView";
import SettingsView from "@/components/SettingsView";
import RevenueChart from "@/components/RevenueChart";
import CustomerSegments from "@/components/CustomerSegments";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Loader2 } from "lucide-react";

const SIDEBAR_COLLAPSED_WIDTH = 68;
const SIDEBAR_EXPANDED_WIDTH = 240;

export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // On mount, restore the active section from the URL (?section=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("section");
    if (s) setActiveSection(s);
  }, []);

  // Navigate: update state AND URL so refresh lands on the same section
  const handleNavigate = useCallback((section: string) => {
    setActiveSection(section);
    router.replace(`/?section=${section}`, { scroll: false });
  }, [router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Derive current sidebar width for content offset
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

  const now = new Date();

  // Show loading state while checking auth
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={handleNavigate}
      />

      {/* Main area */}
      <div
        className="flex flex-col min-h-screen transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Top Nav */}
        <TopNav
          onNavigate={handleNavigate}
          sidebarWidth={sidebarWidth}
        />

        {/* Page content — pushed below fixed header */}
        <main className="flex-1 pt-16 p-6 space-y-6">
          {/* ── Dashboard ──────────────────────────────────────────────────── */}
          {activeSection === "dashboard" && (
            <div className="space-y-6">
              {/* Welcome header card */}
              <Card className="border border-border shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                    Dashboard Overview
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Welcome back, Admin. Here&apos;s your billing &amp; compliance summary.
                  </p>
                </CardContent>
              </Card>

              {/* KPIs */}
              <KPICards />

              {/* Charts and Segments */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <RevenueChart />
                <CustomerSegments />
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
          {/* ── Payment History ────────────────────────────────────────────────── */}
          {activeSection === "payment-history" && <PaymentHistoryView />}
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
