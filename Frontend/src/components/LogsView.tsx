"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Clock3, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAuditLogs, type AuditLog } from "@/lib/audit-logs-api";

type SectionFilter = "all" | "users" | "inventory" | "other";
type TimeFilter = "all" | "day" | "week" | "month";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionTone(action: string) {
  const normalized = action.toLowerCase();
  if (normalized === "delete") return "bg-red-500/10 text-red-700 border-red-200";
  if (normalized === "update") return "bg-amber-500/10 text-amber-700 border-amber-200";
  if (normalized === "use") return "bg-sky-500/10 text-sky-700 border-sky-200";
  return "bg-emerald-500/10 text-emerald-700 border-emerald-200";
}

function isOtherSection(section: string) {
  return section !== "users" && section !== "inventory";
}

function matchesSection(log: AuditLog, filter: SectionFilter) {
  if (filter === "all") return true;
  if (filter === "other") return isOtherSection(log.section);
  return log.section === filter;
}

function matchesTime(log: AuditLog, filter: TimeFilter) {
  if (filter === "all") return true;

  const createdAt = new Date(log.created_at).getTime();
  const now = Date.now();
  const days = filter === "day" ? 1 : filter === "week" ? 7 : 30;

  return now - createdAt <= days * 24 * 60 * 60 * 1000;
}

function sectionLabel(filter: SectionFilter) {
  if (filter === "all") return "All Sections";
  if (filter === "users") return "User Activity";
  if (filter === "inventory") return "Inventory Activity";
  return "Other Activity";
}

export default function LogsView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLogs(await getAuditLogs());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return logs.filter((log) => {
      if (!matchesSection(log, sectionFilter) || !matchesTime(log, timeFilter)) {
        return false;
      }
      if (!query) return true;
      return [log.title, log.actor_name, log.actor_email ?? "", log.actor_role ?? "", log.entity_type, log.action, log.section].some((value) =>
        value.toLowerCase().includes(query)
      );
    });
  }, [logs, search, sectionFilter, timeFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Pick a section first, then filter that section by day, week, or month.</p>
        </div>

        <div className="flex w-full xl:w-auto flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search actor, action or item"
              className="w-full pl-9 pr-4 h-9 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <select
            value={sectionFilter}
            onChange={(event) => setSectionFilter(event.target.value as SectionFilter)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="all">All Sections</option>
            <option value="users">Users</option>
            <option value="inventory">Inventory</option>
            <option value="other">Other</option>
          </select>

          <select
            value={timeFilter}
            onChange={(event) => setTimeFilter(event.target.value as TimeFilter)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="all">All Time</option>
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm">
          <AlertCircle size={16} /> <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{sectionLabel(sectionFilter)}</h2>
            <p className="text-xs text-muted-foreground mt-1">{filtered.length} record{filtered.length === 1 ? "" : "s"}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={18} className="animate-spin mr-2" /> Loading logs...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No logs match the selected section and time filter.</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((log) => (
              <div key={log.id} className="px-4 sm:px-6 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-sm text-foreground">{log.title}</p>
                      <Badge variant="outline" className={cn("capitalize", actionTone(log.action))}>{log.action}</Badge>
                      <Badge variant="outline" className="capitalize">{log.section.replace(/_/g, " ")}</Badge>
                      <Badge variant="outline" className="capitalize">{log.entity_type.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      By <span className="font-semibold text-foreground">{log.actor_name}</span>
                      {log.actor_role ? ` · ${log.actor_role}` : ""}
                      {log.entity_id ? ` · Item #${log.entity_id}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <Clock3 size={12} />
                    <span>{formatDate(log.created_at)} {formatTime(log.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
