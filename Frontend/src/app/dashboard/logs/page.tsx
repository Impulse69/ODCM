"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  History, 
  Search, 
  Filter, 
  Clock, 
  User as UserIcon, 
  ShieldCheck, 
  Eye, 
  FileText,
  Calendar,
  X,
  Layers,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getAuditLogs, type AuditLog } from "@/lib/audit-logs-api";
import { cn } from "@/lib/utils";

function formatLogTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSection, setSelectedSection] = useState("all");
  const [viewLog, setViewLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs();
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.actor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSection = selectedSection === "all" || log.section === selectedSection;
      
      return matchesSearch && matchesSection;
    });
  }, [logs, searchTerm, selectedSection]);

  const sections = useMemo(() => {
    const s = new Set(logs.map(l => l.section));
    return Array.from(s).sort();
  }, [logs]);

  const getActionColor = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes("create") || a.includes("add")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (a.includes("update") || a.includes("edit")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (a.includes("delete") || a.includes("remove")) return "bg-red-50 text-red-700 border-red-200";
    return "bg-zinc-100 text-zinc-700 border-zinc-200";
  };

  return (
    <div className="space-y-6 container mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-odg-orange" />
            System Audit Logs
          </h1>
          <p className="text-muted-foreground">
            Track and audit all administrative actions across the platform.
          </p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm" className="w-fit">
          <Clock className="w-4 h-4 mr-2" /> Refresh Logs
        </Button>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 px-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by actor, action, or title..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 border-t border-border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-45">Timestamp</TableHead>
                  <TableHead className="w-45">Actor</TableHead>
                  <TableHead className="w-30">Section</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead className="w-25">Action</TableHead>
                  <TableHead className="text-right w-20">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="h-16">
                        <div className="animate-pulse bg-muted/50 h-8 rounded-md w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No logs found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="group hover:bg-muted/50 transition-colors">
                      <TableCell className="text-xs font-medium text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {formatLogTimestamp(log.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="text-sm font-semibold flex items-center gap-1.5">
                            <UserIcon className="h-3 w-3 text-muted-foreground" />
                            {log.actor_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground bg-muted w-fit px-1.5 rounded-full lowercase border border-border">
                            {log.actor_role || "system"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-tighter bg-zinc-100 text-zinc-600 border-zinc-200">
                          {log.section}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{log.title}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 capitalize", getActionColor(log.action))}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setViewLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Log Details Modal */}
      <Dialog open={!!viewLog} onOpenChange={(open) => !open && setViewLog(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-border bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg border border-border">
                <FileText className="h-5 w-5 text-odg-orange" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-lg">Audit Entry #{viewLog?.id}</DialogTitle>
                <DialogDescription>
                  Detailed data for this system event.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Actor</Label>
                <div className="p-3 rounded-lg border border-border bg-muted/10 font-medium">
                  {viewLog?.actor_name} ({viewLog?.actor_role})
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Timestamp</Label>
                <div className="p-3 rounded-lg border border-border bg-muted/10 font-medium">
                  {viewLog && new Intl.DateTimeFormat("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  }).format(new Date(viewLog.created_at))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">Action Summary</Label>
              <div className="p-3 rounded-lg border border-border bg-muted/10 font-bold text-sm">
                {viewLog?.title}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3 w-3" /> Before Change
                </Label>
                <div className="bg-zinc-950 rounded-lg p-4 font-mono text-[11px] h-64 overflow-auto text-zinc-300">
                  {viewLog?.before_data ? (
                    <pre>{JSON.stringify(viewLog.before_data, null, 2)}</pre>
                  ) : (
                    <div className="h-full flex items-center justify-center italic text-zinc-500">
                      No prior state recorded
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase flex items-center gap-1 text-emerald-600">
                  <ArrowRight className="h-3 w-3" /> After Change
                </Label>
                <div className="bg-zinc-950 rounded-lg p-4 font-mono text-[11px] h-64 overflow-auto text-emerald-400">
                  {viewLog?.after_data ? (
                    <pre>{JSON.stringify(viewLog.after_data, null, 2)}</pre>
                  ) : (
                    <div className="h-full flex items-center justify-center italic text-zinc-500">
                      No subsequent state recorded
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border bg-muted/30 flex justify-end">
            <Button variant="outline" onClick={() => setViewLog(null)}>
              Close Audit Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
