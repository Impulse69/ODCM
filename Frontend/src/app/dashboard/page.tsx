"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import InventoryView from "@/components/InventoryView";
import UsersView from "@/components/UsersView";
import LogsView from "@/components/LogsView";
import ProfileView from "@/components/ProfileView";
import SettingsView from "@/components/SettingsView";
import RevenueChart from "@/components/RevenueChart";
import CustomerSegments from "@/components/CustomerSegments";
import { Card, CardContent } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const SIDEBAR_COLLAPSED_WIDTH = 68;
const SIDEBAR_EXPANDED_WIDTH = 240;
const RESTRICTED_SUPER_ADMIN_SECTIONS = new Set(["users", "logs"]);

function getInitialSection() {
  if (typeof window === "undefined") {
    return "dashboard";
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("section") ?? "dashboard";
}

function isSuperAdminRole(role?: string) {
  const normalized = String(role ?? "").trim().toLowerCase().replace(/[_\s]+/g, " ");
  return normalized === "super admin";
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState(() => getInitialSection());
  const [sidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const canAccessSuperAdminSections = isSuperAdminRole(user?.role);
  const currentSection = RESTRICTED_SUPER_ADMIN_SECTIONS.has(activeSection) && !canAccessSuperAdminSections ? "dashboard" : activeSection;

  const handleNavigate = useCallback(
    (section: string) => {
      if (RESTRICTED_SUPER_ADMIN_SECTIONS.has(section) && !canAccessSuperAdminSections) {
        section = "dashboard";
      }
      setActiveSection(section);
      setMobileMenuOpen(false);
      router.replace(`/dashboard?section=${section}`, { scroll: false });
    },
    [canAccessSuperAdminSections, router]
  );

  useEffect(() => {
    if (RESTRICTED_SUPER_ADMIN_SECTIONS.has(activeSection) && !canAccessSuperAdminSections) {
      router.replace("/dashboard?section=dashboard", { scroll: false });
    }
  }, [activeSection, canAccessSuperAdminSections, router]);

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;
  const now = new Date();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeSection={currentSection}
        onNavigate={handleNavigate}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div
        className="flex flex-col min-h-screen transition-all duration-300 ease-in-out md:ml-(--sidebar-width) ml-0"
        style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
      >
        <TopNav
          onNavigate={handleNavigate}
          sidebarWidth={sidebarWidth}
          onMobileMenuToggle={() => setMobileMenuOpen((v) => !v)}
        />

        <main className="flex-1 px-3 pb-3 pt-20 sm:px-6 sm:pb-6 sm:pt-20 space-y-6">
          {currentSection === "dashboard" && (
            <div className="space-y-6">
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

              <KPICards />

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <RevenueChart />
                <CustomerSegments />
              </div>

              <SubscriptionTable />
            </div>
          )}

          {currentSection === "customers" && <CustomersView />}
          {currentSection === "vehicles" && <VehiclesView />}
          {currentSection === "subscriptions" && <SubscriptionsView />}
          {currentSection === "removed" && <RemovedView />}
          {currentSection === "payment-history" && <PaymentHistoryView />}
          {currentSection === "inventory" && <InventoryView />}
          {currentSection === "users" && canAccessSuperAdminSections && <UsersView />}
          {currentSection === "logs" && canAccessSuperAdminSections && <LogsView />}

          {currentSection === "bulk-import" && (
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

          {currentSection === "profile" && <ProfileView />}
          {currentSection === "settings" && <SettingsView />}
        </main>

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
