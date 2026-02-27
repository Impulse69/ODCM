"use client";

import { useState } from "react";
import { Settings, Wifi, Bell, Globe, Database, Shield, Save, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function ToggleSwitch({ id, defaultChecked = false }: { id: string; defaultChecked?: boolean }) {
    const [on, setOn] = useState(defaultChecked);
    return (
        <button
            id={id}
            role="switch"
            aria-checked={on}
            onClick={() => setOn(!on)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${on ? "bg-primary" : "bg-muted-foreground/25"}`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${on ? "translate-x-4.5" : "translate-x-0.5"}`}
            />
        </button>
    );
}

export default function SettingsView() {
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div className="space-y-5 animate-fade-in-up" style={{ opacity: 0 }}>
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">System Settings</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Configure API connections, notifications, and global preferences
                </p>
            </div>

            <Tabs defaultValue="api">
                <TabsList className="h-9 bg-muted/60 p-0.5 gap-0.5 mb-5">
                    {[
                        { value: "api", label: "API & Integrations", icon: <Wifi size={13} /> },
                        { value: "notif", label: "Notifications", icon: <Bell size={13} /> },
                        { value: "system", label: "System", icon: <Globe size={13} /> },
                        { value: "security", label: "Security", icon: <Shield size={13} /> },
                    ].map((t) => (
                        <TabsTrigger
                            key={t.value}
                            value={t.value}
                            className="h-8 px-3 text-xs font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                        >
                            {t.icon} {t.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* API Tab */}
                <TabsContent value="api" className="space-y-4">
                    <Card className="border border-border shadow-sm">
                        <CardHeader className="border-b border-border py-4 px-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Wifi size={16} /> Trakzee API Configuration
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-0.5">
                                        Manage the integration with the Trakzee vehicle tracking platform
                                    </CardDescription>
                                </div>
                                <Badge
                                    variant="outline"
                                    className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[0.65rem] font-semibold"
                                >
                                    Connected
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">API Base URL</Label>
                                    <Input defaultValue="https://api.trakzee.io/v2" className="h-9 text-sm font-mono" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">API Key</Label>
                                    <Input type="password" defaultValue="tzk_prod_••••••••••••" className="h-9 text-sm font-mono" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Sync Interval (minutes)</Label>
                                    <Input type="number" defaultValue="15" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Retry Attempts</Label>
                                    <Input type="number" defaultValue="3" className="h-9 text-sm" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                <div>
                                    <p className="text-xs font-semibold text-foreground">Auto-sync on billing change</p>
                                    <p className="text-[0.7rem] text-muted-foreground">Automatically notify Trakzee when a payment is recorded</p>
                                </div>
                                <ToggleSwitch id="auto-sync" defaultChecked />
                            </div>
                            <Button size="sm" onClick={handleSave} className="gap-2">
                                <Save size={14} /> {saved ? "Saved!" : "Save API Settings"}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border border-border shadow-sm">
                        <CardHeader className="border-b border-border py-4 px-5">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Database size={16} /> Database & Export
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-3">
                            {[
                                { label: "Export all subscriptions to CSV", icon: <ChevronRight size={14} />, color: "text-foreground" },
                                { label: "Backup database snapshot", icon: <ChevronRight size={14} />, color: "text-foreground" },
                                { label: "Clear all cached data", icon: <ChevronRight size={14} />, color: "text-destructive" },
                            ].map((a) => (
                                <button
                                    key={a.label}
                                    className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 text-sm transition-colors ${a.color}`}
                                >
                                    <span className="font-medium">{a.label}</span>
                                    {a.icon}
                                </button>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notifications Tab */}
                <TabsContent value="notif" className="space-y-4">
                    <Card className="border border-border shadow-sm">
                        <CardHeader className="border-b border-border py-4 px-5">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Bell size={16} /> Notification Preferences
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-3">
                            {[
                                { label: "Overdue payment alerts", detail: "Get notified when a subscription goes overdue", on: true },
                                { label: "Trakzee sync failures", detail: "Alert when the Trakzee API fails to sync", on: true },
                                { label: "Bulk import completion", detail: "Notify on successful or failed CSV imports", on: true },
                                { label: "API rate limit warnings", detail: "Warn when API usage exceeds 75%", on: false },
                                { label: "Weekly summary report", detail: "Receive a weekly digest of revenue and compliance stats", on: false },
                            ].map((n, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">{n.label}</p>
                                        <p className="text-[0.7rem] text-muted-foreground mt-0.5">{n.detail}</p>
                                    </div>
                                    <ToggleSwitch id={`notif-${i}`} defaultChecked={n.on} />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* System Tab */}
                <TabsContent value="system" className="space-y-4">
                    <Card className="border border-border shadow-sm">
                        <CardHeader className="border-b border-border py-4 px-5">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Globe size={16} /> General System Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Company Name</Label>
                                    <Input defaultValue="Office Data Group (ODG)" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Default Currency</Label>
                                    <Input defaultValue="GH₵ (Ghanaian Cedi)" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Billing Grace Period (days)</Label>
                                    <Input type="number" defaultValue="7" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Deactivation Threshold (days overdue)</Label>
                                    <Input type="number" defaultValue="14" className="h-9 text-sm" />
                                </div>
                            </div>
                            <Button size="sm" onClick={handleSave} className="gap-2">
                                <Save size={14} /> {saved ? "Saved!" : "Save Settings"}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security" className="space-y-4">
                    <Card className="border border-border shadow-sm">
                        <CardHeader className="border-b border-border py-4 px-5">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Shield size={16} /> Security Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-3">
                            {[
                                { label: "Two-factor authentication (2FA)", detail: "Require OTP on every login", on: false },
                                { label: "Session timeout", detail: "Auto-logout after 30 minutes of inactivity", on: true },
                                { label: "Audit log", detail: "Record all admin actions to the audit trail", on: true },
                                { label: "IP whitelist enforcement", detail: "Restrict access to approved IP addresses", on: false },
                            ].map((n, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">{n.label}</p>
                                        <p className="text-[0.7rem] text-muted-foreground mt-0.5">{n.detail}</p>
                                    </div>
                                    <ToggleSwitch id={`sec-${i}`} defaultChecked={n.on} />
                                </div>
                            ))}
                            <Separator />
                            <Button size="sm" variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive hover:text-white">
                                <Shield size={14} /> Clear all active sessions
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
