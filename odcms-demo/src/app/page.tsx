"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";
import KPICards from "@/components/KPICards";
import BulkUpload from "@/components/BulkUpload";
import SubscriptionTable from "@/components/SubscriptionTable";

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarWidth, setSidebarWidth] = useState(256);

  // We track sidebar collapse via a callback approach
  const handleNavigate = (section: string) => {
    setActiveSection(section);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar activeSection={activeSection} onNavigate={handleNavigate} />

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          marginLeft: 256,
          transition: "margin-left 0.3s ease",
          minWidth: 0,
        }}
      >
        <TopNav onNavigate={handleNavigate} />

        <main style={{ padding: "1.5rem" }}>
          {/* Dashboard View */}
          {activeSection === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Page Title */}
              <div>
                <h1
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: "#1A1A2E",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Dashboard Overview
                </h1>
                <p style={{ fontSize: "0.875rem", color: "#71717A", marginTop: "0.25rem" }}>
                  Welcome back, Admin. Here&apos;s your billing & compliance summary.
                </p>
              </div>

              {/* KPI Cards */}
              <KPICards />

              {/* Subscription Table */}
              <SubscriptionTable />
            </div>
          )}

          {/* Bulk Import View */}
          {activeSection === "bulk-import" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <h1
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: "#1A1A2E",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Bulk Data Import
                </h1>
                <p style={{ fontSize: "0.875rem", color: "#71717A", marginTop: "0.25rem" }}>
                  Upload CSV files to import customer and vehicle data in bulk.
                </p>
              </div>

              <BulkUpload />
            </div>
          )}

          {/* Customers View */}
          {activeSection === "customers" && (
            <PlaceholderSection
              title="Customer Management"
              description="View and manage all registered customers."
              icon="👥"
            />
          )}

          {/* Vehicles View */}
          {activeSection === "vehicles" && (
            <PlaceholderSection
              title="Vehicle Registry"
              description="Track all vehicles with IMEI and Trakzee sync status."
              icon="🚗"
            />
          )}

          {/* Subscriptions View */}
          {activeSection === "subscriptions" && (
            <PlaceholderSection
              title="Subscription Plans"
              description="Manage subscription tiers: Basic, Standard, Premium, Fleet."
              icon="💳"
            />
          )}

          {/* Removed List (Enforcement) */}
          {activeSection === "removed" && (
            <PlaceholderSection
              title="Removed List — Enforcement"
              description="Vehicles forcefully deactivated due to non-payment or policy violation."
              icon="🛑"
            />
          )}
          {/* Profile View */}
          {activeSection === "profile" && (
            <PlaceholderSection
              title="Admin Profile"
              description="Manage your account details and credentials."
              icon="👤"
            />
          )}

          {/* Settings View */}
          {activeSection === "settings" && (
            <PlaceholderSection
              title="System Settings"
              description="Configure API connections, billing thresholds, and global preferences."
              icon="⚙️"
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Placeholder for non-dashboard sections ─────────────────────────────────

function PlaceholderSection({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div
      className="animate-fade-in-up"
      style={{
        opacity: 0,
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "#1A1A2E",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#71717A", marginTop: "0.25rem" }}>
          {description}
        </p>
      </div>

      <div
        className="card"
        style={{
          padding: "4rem 2rem",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div style={{ fontSize: "3rem" }}>{icon}</div>
        <div>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1A1A2E" }}>
            {title}
          </h3>
          <p style={{ fontSize: "0.875rem", color: "#A1A1AA", marginTop: "0.25rem" }}>
            This section is under development. Content will be available soon.
          </p>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.5rem 1rem",
            background: "#FFF5EC",
            borderRadius: "0.5rem",
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "#ED7D31",
            marginTop: "0.5rem",
          }}
        >
          🚧 Coming Soon
        </div>
      </div>
    </div>
  );
}
