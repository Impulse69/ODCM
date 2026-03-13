"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Bell, Globe, Shield, Save, Send, Eye, EyeOff, CheckCircle2, AlertCircle, Play, Loader2, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getSmsConfig, saveSmsConfig, testSmsApi, testEmailApi, runSmsJob, type SmsJobResult } from "@/lib/sms-api";
import { useToast } from "@/lib/toast";

interface ToggleProps {
    id: string;
    checked: boolean;
    onChange: (val: boolean) => void;
}

function ToggleSwitch({ id, checked, onChange }: ToggleProps) {
    return (
        <button
            id={id}
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${checked ? "bg-primary" : "bg-muted-foreground/25"}`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${checked ? "translate-x-4.5" : "translate-x-0.5"}`}
            />
        </button>
    );
}

export default function SettingsView() {
    // ── Email Alert Config ───────────────────────────────────────────────────
    const [emailConfig, setEmailConfig] = useState({
        adminEmail: "",
        smtpHost: "",
        smtpPort: "587",
        smtpUser: "",
        smtpPass: "",
    });
    const [showSmtpPass, setShowSmtpPass] = useState(false);
    const [emailSaved, setEmailSaved] = useState(false);
    const [smtpPassSet, setSmtpPassSet] = useState(false);
    const [emailTestStatus, setEmailTestStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

    // ── Hubtel SMS Config ────────────────────────────────────────────────────
    const [hubtelConfig, setHubtelConfig] = useState({
        clientId: "",
        clientSecret: "",
        senderId: "ODG",
        testPhone: "",
    });
    const [showSecret, setShowSecret] = useState(false);
    const [smsSaved, setSmsSaved] = useState(false);
    const [testStatus, setTestStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
    const [hubtelConnected, setHubtelConnected] = useState(false);
    const [configLoading, setConfigLoading] = useState(true);

    // Load config from backend on mount
    useEffect(() => {
        getSmsConfig()
            .then((cfg) => {
                setHubtelConfig((p) => ({
                    ...p,
                    clientId: cfg.clientId,
                    senderId: cfg.senderId,
                }));
                setHubtelConnected(cfg.clientSecretSet && cfg.clientId.length > 0);
                setSmsNotifs({ dueSoon: cfg.dueSoonEnabled, expired: cfg.expiredEnabled });
                setTemplates({ dueSoon: cfg.dueSoonTemplate, expired: cfg.expiredTemplate });
                setSystemSettings((p) => ({
                    ...p,
                    firstReminderDays: cfg.firstReminderDays,
                    secondReminderDays: cfg.secondReminderDays,
                }));
                setEmailConfig((p) => ({
                    ...p,
                    adminEmail: cfg.adminEmail ?? "",
                    smtpHost:   cfg.smtpHost   ?? "",
                    smtpPort:   cfg.smtpPort   ?? "587",
                    smtpUser:   cfg.smtpUser   ?? "",
                }));
                setSmtpPassSet(cfg.smtpPassSet ?? false);
            })
            .catch(() => {
                // toast not available yet at this point — it's initialised below
                // failure surfaced via empty fields
            })
            .finally(() => setConfigLoading(false));
    }, []);

    // ── SMS Notification toggles ─────────────────────────────────────────────
    const [smsNotifs, setSmsNotifs] = useState({ dueSoon: true, expired: true });

    const [templates, setTemplates] = useState({
        dueSoon:
            "Dear {customerName}, your vehicle ({vehiclePlate}) subscription expires in {daysLeft} day(s). Please renew to avoid deactivation. - ODG",
        expired:
            "Dear {customerName}, your vehicle ({vehiclePlate}) subscription has expired. Please contact us immediately to renew. - ODG",
    });

    // ── System / General Settings ────────────────────────────────────────────
    const [systemSettings, setSystemSettings] = useState({
        companyName: "Office Data Group (ODG)",
        currency: "GH₵",
        firstReminderDays: 14,
        secondReminderDays: 7,
    });
    const [systemSaved, setSystemSaved] = useState(false);

    // ── SMS Job ───────────────────────────────────────────────────────────────
    const [jobRunning, setJobRunning] = useState(false);
    const [jobResult, setJobResult] = useState<SmsJobResult | null>(null);

    // ── Security ─────────────────────────────────────────────────────────────
    const [security, setSecurity] = useState({ twoFactor: false, sessionTimeout: true });

    const toast = useToast();

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleSaveHubtel = async () => {
        try {
            await saveSmsConfig({
                clientId: hubtelConfig.clientId,
                ...(hubtelConfig.clientSecret ? { clientSecret: hubtelConfig.clientSecret } : {}),
                senderId: hubtelConfig.senderId,
            });
            const connected = hubtelConfig.clientId.trim().length > 0 &&
                (hubtelConfig.clientSecret.trim().length > 0 || hubtelConnected);
            setHubtelConnected(connected);
            setSmsSaved(true);
            setTimeout(() => setSmsSaved(false), 2500);
            toast.success("SMS configuration saved", "Your Hubtel credentials have been saved to the database.");
        } catch (err) {
            toast.error("Failed to save SMS configuration", err instanceof Error ? err.message : "Please check your connection and try again.");
        }
    };

    const handleTestSms = async () => {
        if (!hubtelConfig.testPhone.trim()) return;
        setTestStatus("sending");
        try {
            await testSmsApi(hubtelConfig.testPhone.trim());
            setTestStatus("success");
            toast.success("Test SMS sent", `Message delivered to ${hubtelConfig.testPhone.trim()}.`);
        } catch (err) {
            setTestStatus("error");
            toast.error("Test SMS failed", err instanceof Error ? err.message : "Check your credentials and try again.");
        } finally {
            setTimeout(() => setTestStatus("idle"), 3000);
        }
    };

    const handleSaveSystem = async () => {
        try {
            await saveSmsConfig({
                firstReminderDays: systemSettings.firstReminderDays,
                secondReminderDays: systemSettings.secondReminderDays,
            });
            setSystemSaved(true);
            setTimeout(() => setSystemSaved(false), 2500);
            toast.success("General settings saved", `Reminders set to ${systemSettings.firstReminderDays} days and ${systemSettings.secondReminderDays} days before expiry.`);
        } catch (err) {
            toast.error("Failed to save settings", err instanceof Error ? err.message : "Please try again.");
        }
    };

    const handleSaveEmail = async () => {
        if (emailConfig.adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailConfig.adminEmail.trim())) {
            toast.error("Invalid admin email", "Enter a valid admin email address.");
            return;
        }
        if (emailConfig.smtpHost && (emailConfig.smtpHost.includes("@") || /\s/.test(emailConfig.smtpHost))) {
            toast.error("Invalid SMTP host", "Use a mail server host like smtp.office365.com, not an email address.");
            return;
        }
        if (emailConfig.smtpUser && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailConfig.smtpUser.trim())) {
            toast.error("Invalid SMTP username", "SMTP username should usually be the mailbox email address.");
            return;
        }
        if (emailConfig.smtpPort && !/^\d+$/.test(emailConfig.smtpPort.trim())) {
            toast.error("Invalid SMTP port", "SMTP port must be a number such as 587 or 465.");
            return;
        }
        try {
            await saveSmsConfig({
                adminEmail: emailConfig.adminEmail.trim(),
                smtpHost:   emailConfig.smtpHost.trim(),
                smtpPort:   emailConfig.smtpPort.trim(),
                smtpUser:   emailConfig.smtpUser.trim(),
                ...(emailConfig.smtpPass ? { smtpPass: emailConfig.smtpPass.trim() } : {}),
            });
            if (emailConfig.smtpPass) setSmtpPassSet(true);
            setEmailSaved(true);
            setTimeout(() => setEmailSaved(false), 2500);
            toast.success("Email alert settings saved", "Admin email notifications are now configured.");
        } catch (err) {
            toast.error("Failed to save email settings", err instanceof Error ? err.message : "Please try again.");
        }
    };

    const handleTestEmail = async () => {
        if (!emailConfig.adminEmail.trim() || !emailConfig.smtpHost.trim() || !emailConfig.smtpUser.trim()) {
            toast.error("Email settings incomplete", "Set admin email, SMTP host and SMTP username before testing.");
            return;
        }
        if (!smtpPassSet && !emailConfig.smtpPass.trim()) {
            toast.error("SMTP password required", "Enter SMTP password first, then save and test.");
            return;
        }

        setEmailTestStatus("sending");
        try {
            await saveSmsConfig({
                adminEmail: emailConfig.adminEmail.trim(),
                smtpHost: emailConfig.smtpHost.trim(),
                smtpPort: emailConfig.smtpPort.trim(),
                smtpUser: emailConfig.smtpUser.trim(),
                ...(emailConfig.smtpPass ? { smtpPass: emailConfig.smtpPass.trim() } : {}),
            });
            if (emailConfig.smtpPass) setSmtpPassSet(true);

            const result = await testEmailApi();
            setEmailTestStatus("success");
            const acceptedText = result.accepted?.length ? result.accepted.join(", ") : "none";
            const rejectedText = result.rejected?.length ? ` | rejected: ${result.rejected.join(", ")}` : "";
            const smtpResponse = result.response ? ` | SMTP: ${result.response}` : "";
            const reportInfo = result.reportFileName
                ? ` | PDF: ${result.reportFileName} (${result.itemCount ?? 0} items)`
                : "";
            toast.success("Test email accepted by SMTP", `accepted: ${acceptedText}${rejectedText}${smtpResponse}${reportInfo}`);
        } catch (err) {
            setEmailTestStatus("error");
            toast.error("Test email failed", err instanceof Error ? err.message : "Check SMTP settings and try again.");
        } finally {
            setTimeout(() => setEmailTestStatus("idle"), 3500);
        }
    };

    return (
        <div className="space-y-5 animate-fade-in-up" style={{ opacity: 0 }}>
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">System Settings</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Configure SMS integration, notification rules, and global preferences
                </p>
            </div>

            <Tabs defaultValue="sms">
                <TabsList className="h-9 bg-muted/60 p-0.5 gap-0.5 mb-5">
                    {[
                        { value: "sms", label: "SMS Integration", icon: <MessageSquare size={13} /> },
                        { value: "notif", label: "Notifications", icon: <Bell size={13} /> },
                        { value: "system", label: "General", icon: <Globe size={13} /> },
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

                {/* ── SMS Integration Tab ─────────────────────────────────────── */}
                <TabsContent value="sms" className="space-y-4">
                    <Card className="border border-border shadow-sm">
                        <CardHeader className="border-b border-border py-4 px-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <MessageSquare size={16} /> Hubtel SMS Configuration
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-0.5">
                                        Connect Hubtel to send automated SMS notifications to your customers
                                    </CardDescription>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={
                                        hubtelConnected
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[0.65rem] font-semibold"
                                            : "bg-amber-50 text-amber-700 border-amber-200 text-[0.65rem] font-semibold"
                                    }
                                >
                                    {hubtelConnected ? "Connected" : "Not Configured"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Client ID */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Client ID</Label>
                                    <Input
                                        placeholder="e.g. ekyyuuxxxx"
                                        value={hubtelConfig.clientId}
                                        onChange={(e) => setHubtelConfig((p) => ({ ...p, clientId: e.target.value }))}
                                        className="h-9 text-sm font-mono"
                                    />
                                    <p className="text-[0.68rem] text-muted-foreground">
                                        Found in your Hubtel developer portal
                                    </p>
                                </div>

                                {/* Client Secret */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Client Secret</Label>
                                    <div className="relative">
                                        <Input
                                            type={showSecret ? "text" : "password"}
                                            placeholder="••••••••••••"
                                            value={hubtelConfig.clientSecret}
                                            onChange={(e) =>
                                                setHubtelConfig((p) => ({ ...p, clientSecret: e.target.value }))
                                            }
                                            className="h-9 text-sm font-mono pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowSecret((s) => !s)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                    <p className="text-[0.68rem] text-muted-foreground">
                                        Keep this secret — never share it
                                    </p>
                                </div>

                                {/* Sender ID */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Sender ID</Label>
                                    <Input
                                        placeholder="e.g. ODG"
                                        value={hubtelConfig.senderId}
                                        maxLength={11}
                                        onChange={(e) => setHubtelConfig((p) => ({ ...p, senderId: e.target.value }))}
                                        className="h-9 text-sm"
                                    />
                                    <p className="text-[0.68rem] text-muted-foreground">
                                        Alphanumeric · max 11 chars · shown as sender name on recipient&apos;s phone
                                    </p>
                                </div>
                            </div>
                            <Separator />

                            {/* Test SMS */}
                            <div>
                                <p className="text-xs font-semibold text-foreground mb-2">Send a Test SMS</p>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="e.g. 0244123456"
                                        value={hubtelConfig.testPhone}
                                        onChange={(e) =>
                                            setHubtelConfig((p) => ({ ...p, testPhone: e.target.value }))
                                        }
                                        className="h-9 text-sm max-w-xs"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={testStatus === "sending" || !hubtelConfig.testPhone.trim()}
                                        onClick={handleTestSms}
                                        className="gap-2 shrink-0"
                                    >
                                        <Send size={13} />
                                        {testStatus === "sending" ? "Sending…" : "Send Test"}
                                    </Button>
                                </div>
                                {testStatus === "success" && (
                                    <p className="flex items-center gap-1.5 mt-2 text-emerald-600 text-xs">
                                        <CheckCircle2 size={13} /> Test SMS sent successfully!
                                    </p>
                                )}
                                {testStatus === "error" && (
                                    <p className="flex items-center gap-1.5 mt-2 text-destructive text-xs">
                                        <AlertCircle size={13} /> Failed to send. Check your credentials and try again.
                                    </p>
                                )}
                            </div>

                            <Button size="sm" onClick={handleSaveHubtel} className="gap-2" disabled={configLoading}>
                                <Save size={14} /> {smsSaved ? "Saved!" : "Save SMS Configuration"}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* ── Admin Email Alert Card ─────────────────────────────── */}
                    <Card className="border border-border shadow-sm">
                        <CardHeader className="border-b border-border py-4 px-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Mail size={16} /> Admin Email Alerts
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-0.5">
                                        Receive an email summary whenever expired vehicles are processed — listing every customer, their plate, and the amount owed
                                    </CardDescription>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={
                                        emailConfig.adminEmail && emailConfig.smtpHost && emailConfig.smtpUser && smtpPassSet
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[0.65rem] font-semibold"
                                            : "bg-amber-50 text-amber-700 border-amber-200 text-[0.65rem] font-semibold"
                                    }
                                >
                                    {emailConfig.adminEmail && emailConfig.smtpHost && emailConfig.smtpUser && smtpPassSet
                                        ? "Configured"
                                        : "Not Configured"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Admin Email */}
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label className="text-xs font-semibold">Admin Email Address</Label>
                                    <Input
                                        type="email"
                                        placeholder="admin@yourcompany.com"
                                        value={emailConfig.adminEmail}
                                        onChange={(e) => setEmailConfig((p) => ({ ...p, adminEmail: e.target.value }))}
                                        className="h-9 text-sm"
                                    />
                                    <p className="text-[0.68rem] text-muted-foreground">
                                        This address will receive the expired vehicle summary email each time the SMS job runs
                                    </p>
                                </div>

                                {/* SMTP Host */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">SMTP Host</Label>
                                    <Input
                                        placeholder="smtp.office365.com"
                                        value={emailConfig.smtpHost}
                                        onChange={(e) => setEmailConfig((p) => ({ ...p, smtpHost: e.target.value }))}
                                        className="h-9 text-sm font-mono"
                                    />
                                    <p className="text-[0.68rem] text-muted-foreground">
                                        Mail server only, for example <strong>smtp.office365.com</strong>. Do not enter an email address here.
                                    </p>
                                </div>

                                {/* SMTP Port */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">SMTP Port</Label>
                                    <Input
                                        placeholder="587"
                                        value={emailConfig.smtpPort}
                                        onChange={(e) => setEmailConfig((p) => ({ ...p, smtpPort: e.target.value }))}
                                        className="h-9 text-sm"
                                    />
                                    <p className="text-[0.68rem] text-muted-foreground">587 (TLS) or 465 (SSL)</p>
                                </div>

                                {/* SMTP Username */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">SMTP Username</Label>
                                    <Input
                                        placeholder="your@gmail.com"
                                        value={emailConfig.smtpUser}
                                        onChange={(e) => setEmailConfig((p) => ({ ...p, smtpUser: e.target.value }))}
                                        className="h-9 text-sm"
                                    />
                                </div>

                                {/* SMTP Password */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">
                                        SMTP Password / App Password
                                        {smtpPassSet && !emailConfig.smtpPass && (
                                            <span className="ml-2 text-emerald-600 font-normal">✓ saved</span>
                                        )}
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            type={showSmtpPass ? "text" : "password"}
                                            placeholder={smtpPassSet ? "••••••••  (leave blank to keep existing)" : "Enter app password"}
                                            value={emailConfig.smtpPass}
                                            onChange={(e) => setEmailConfig((p) => ({ ...p, smtpPass: e.target.value }))}
                                            className="h-9 text-sm font-mono pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowSmtpPass((s) => !s)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showSmtpPass ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                    <p className="text-[0.68rem] text-muted-foreground">
                                        For Gmail use an <strong>App Password</strong> (not your account password)
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between gap-3">
                                <p className="text-[0.7rem] text-muted-foreground max-w-sm">
                                    Every Friday at 7:00 AM, the system sends one bundled weekly summary with a downloadable PDF of vehicles that expired and had SMS sent.
                                </p>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleTestEmail}
                                        className="gap-2"
                                        disabled={configLoading || emailTestStatus === "sending"}
                                    >
                                        {emailTestStatus === "sending" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                        {emailTestStatus === "sending" ? "Testing..." : "Test Weekly PDF"}
                                    </Button>
                                    <Button size="sm" onClick={handleSaveEmail} className="gap-2" disabled={configLoading}>
                                        <Save size={14} /> {emailSaved ? "Saved!" : "Save Email Settings"}
                                    </Button>
                                </div>
                            </div>
                            {emailTestStatus === "success" && (
                                <p className="flex items-center gap-1.5 text-emerald-600 text-xs">
                                    <CheckCircle2 size={13} /> Test email sent successfully.
                                </p>
                            )}
                            {emailTestStatus === "error" && (
                                <p className="flex items-center gap-1.5 text-destructive text-xs">
                                    <AlertCircle size={13} /> Test email failed. Check SMTP auth and mailbox settings.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Notifications Tab ───────────────────────────────────────── */}
                <TabsContent value="notif" className="space-y-4">
                    <Card className="border border-border shadow-sm">
                        <CardHeader className="border-b border-border py-4 px-5">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Bell size={16} /> SMS Notification Rules
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                Control when customers receive automated SMS alerts about their vehicle subscriptions
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            {/* Hubtel not configured warning */}
                            {!hubtelConnected && (
                                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                    <p className="text-xs">
                                        Hubtel SMS is not configured. Go to the{" "}
                                        <strong>SMS Integration</strong> tab to set up your credentials before
                                        enabling notifications.
                                    </p>
                                </div>
                            )}

                            {/* Run SMS Job */}
                            {hubtelConnected && (
                                <div className="p-3 rounded-lg border border-border bg-muted/20">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-semibold text-foreground">Run SMS Job Now</p>
                                            <p className="text-[0.7rem] text-muted-foreground mt-0.5">
                                                Manually sweep all vehicles and send SMS to customers whose
                                                subscriptions are due soon or expired.
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={jobRunning || !smsNotifs.dueSoon && !smsNotifs.expired}
                                            onClick={async () => {
                                                setJobRunning(true);
                                                setJobResult(null);
                                                try {
                                                    const result = await runSmsJob();
                                                    setJobResult(result);
                                                    toast.success(
                                                        "SMS job completed",
                                                        `${result.sent} sent · ${result.failed} failed · ${result.removed} moved to removed · ${result.skipped} skipped`,
                                                    );
                                                } catch (err) {
                                                    toast.error("SMS job failed", err instanceof Error ? err.message : "Please try again.");
                                                } finally {
                                                    setJobRunning(false);
                                                }
                                            }}
                                            className="gap-2 shrink-0"
                                        >
                                            {jobRunning ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                                            {jobRunning ? "Running…" : "Run Job"}
                                        </Button>
                                    </div>
                                    {jobResult && (
                                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border text-xs">
                                            <span className="text-emerald-700 font-semibold">✓ {jobResult.sent} sent</span>
                                            <span className="text-red-600 font-semibold">✕ {jobResult.failed} failed</span>
                                            {jobResult.removed > 0 && (
                                                <span className="text-orange-600 font-semibold">{jobResult.removed} moved to removed</span>
                                            )}
                                            <span className="text-muted-foreground">{jobResult.skipped} skipped</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Due Soon */}
                            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">Due Soon SMS</p>
                                        <p className="text-[0.7rem] text-muted-foreground mt-0.5">
                                            Send SMS when a vehicle subscription is approaching expiry (triggers at{" "}
                                            <strong>{systemSettings.firstReminderDays} days</strong> and{" "}
                                            <strong>{systemSettings.secondReminderDays} days</strong> before expiry)
                                        </p>
                                    </div>
                                    <ToggleSwitch
                                        id="sms-due-soon"
                                        checked={smsNotifs.dueSoon}
                                        onChange={(v) => {
                                            setSmsNotifs((p) => ({ ...p, dueSoon: v }));
                                            saveSmsConfig({ dueSoonEnabled: v })
                                                .then(() => toast.success("Due Soon SMS " + (v ? "enabled" : "disabled")))
                                                .catch(() => toast.error("Failed to save", "Could not update notification setting."));
                                        }}
                                    />
                                </div>
                                {smsNotifs.dueSoon && (
                                    <div className="space-y-1.5 pt-1">
                                        <Label className="text-[0.68rem] font-semibold text-muted-foreground uppercase tracking-wide">
                                            Message Template
                                        </Label>
                                        <Textarea
                                            className="text-xs min-h-18 font-mono resize-none"
                                            value={templates.dueSoon}
                                            onChange={(e) =>
                                                setTemplates((p) => ({ ...p, dueSoon: e.target.value }))
                                            }
                                            onBlur={() =>
                                                saveSmsConfig({ dueSoonTemplate: templates.dueSoon })
                                                    .then(() => toast.success("Due Soon template saved"))
                                                    .catch(() => toast.error("Failed to save template"))
                                            }
                                        />
                                        <p className="text-[0.65rem] text-muted-foreground">
                                            Variables:{" "}
                                            <code className="bg-muted px-1 rounded text-[0.65rem]">
                                                {"{customerName}"}
                                            </code>{" "}
                                            <code className="bg-muted px-1 rounded text-[0.65rem]">
                                                {"{vehiclePlate}"}
                                            </code>{" "}
                                            <code className="bg-muted px-1 rounded text-[0.65rem]">
                                                {"{daysLeft}"}
                                            </code>
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Expired */}
                            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">Expired SMS</p>
                                        <p className="text-[0.7rem] text-muted-foreground mt-0.5">
                                            Send SMS to the customer when their vehicle subscription has expired
                                        </p>
                                    </div>
                                    <ToggleSwitch
                                        id="sms-expired"
                                        checked={smsNotifs.expired}
                                        onChange={(v) => {
                                            setSmsNotifs((p) => ({ ...p, expired: v }));
                                            saveSmsConfig({ expiredEnabled: v })
                                                .then(() => toast.success("Expired SMS " + (v ? "enabled" : "disabled")))
                                                .catch(() => toast.error("Failed to save", "Could not update notification setting."));
                                        }}
                                    />
                                </div>
                                {smsNotifs.expired && (
                                    <div className="space-y-1.5 pt-1">
                                        <Label className="text-[0.68rem] font-semibold text-muted-foreground uppercase tracking-wide">
                                            Message Template
                                        </Label>
                                        <Textarea
                                            className="text-xs min-h-18 font-mono resize-none"
                                            value={templates.expired}
                                            onChange={(e) =>
                                                setTemplates((p) => ({ ...p, expired: e.target.value }))
                                            }
                                            onBlur={() =>
                                                saveSmsConfig({ expiredTemplate: templates.expired })
                                                    .then(() => toast.success("Expired template saved"))
                                                    .catch(() => toast.error("Failed to save template"))
                                            }
                                        />
                                        <p className="text-[0.65rem] text-muted-foreground">
                                            Variables:{" "}
                                            <code className="bg-muted px-1 rounded text-[0.65rem]">
                                                {"{customerName}"}
                                            </code>{" "}
                                            <code className="bg-muted px-1 rounded text-[0.65rem]">
                                                {"{vehiclePlate}"}
                                            </code>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notification schedule summary */}
                    <Card className="border border-border shadow-sm">
                        <CardHeader className="border-b border-border py-4 px-5">
                            <CardTitle className="text-sm font-semibold text-muted-foreground">
                                Notification Schedule Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-2">
                            {[
                                {
                                    trigger: `${systemSettings.firstReminderDays} days before expiry`,
                                    action: "Due Soon SMS — 1st reminder",
                                    enabled: smsNotifs.dueSoon,
                                },
                                {
                                    trigger: `${systemSettings.secondReminderDays} days before expiry`,
                                    action: "Due Soon SMS — final reminder",
                                    enabled: smsNotifs.dueSoon,
                                },
                                {
                                    trigger: "On expiry date",
                                    action: "Expired SMS",
                                    enabled: smsNotifs.expired,
                                },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 text-xs"
                                >
                                    <span className="font-medium text-foreground">{item.trigger}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">{item.action}</span>
                                        <Badge
                                            variant="outline"
                                            className={
                                                item.enabled
                                                    ? "text-emerald-700 bg-emerald-50 border-emerald-200 text-[0.6rem]"
                                                    : "text-muted-foreground bg-muted text-[0.6rem]"
                                            }
                                        >
                                            {item.enabled ? "Active" : "Disabled"}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                            <p className="text-[0.68rem] text-muted-foreground pt-1">
                                Reminder thresholds are configured under the <strong>General</strong> tab.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── General / System Tab ────────────────────────────────────── */}
                <TabsContent value="system" className="space-y-4">
                    <Card className="border border-border shadow-sm">
                        <CardHeader className="border-b border-border py-4 px-5">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Globe size={16} /> General Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Company Name</Label>
                                    <Input
                                        value={systemSettings.companyName}
                                        onChange={(e) =>
                                            setSystemSettings((p) => ({ ...p, companyName: e.target.value }))
                                        }
                                        className="h-9 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Default Currency</Label>
                                    <Input
                                        value={systemSettings.currency}
                                        onChange={(e) =>
                                            setSystemSettings((p) => ({ ...p, currency: e.target.value }))
                                        }
                                        className="h-9 text-sm"
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* SMS Thresholds */}
                            <div>
                                <p className="text-xs font-semibold text-foreground mb-1">
                                    SMS Notification Thresholds
                                </p>
                                <p className="text-[0.7rem] text-muted-foreground mb-3">
                                    Set how many days before expiry the system sends &ldquo;Due Soon&rdquo; reminders. When a
                                    subscription reaches day 0 the &ldquo;Expired&rdquo; SMS is triggered automatically.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">
                                            First Reminder (days before expiry)
                                        </Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={systemSettings.firstReminderDays}
                                            onChange={(e) =>
                                                setSystemSettings((p) => ({
                                                    ...p,
                                                    firstReminderDays: parseInt(e.target.value) || 14,
                                                }))
                                            }
                                            className="h-9 text-sm"
                                        />
                                        <p className="text-[0.68rem] text-muted-foreground">
                                            e.g. 14 → SMS sent 2 weeks before expiry
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">
                                            Second Reminder (days before expiry)
                                        </Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={systemSettings.secondReminderDays}
                                            onChange={(e) =>
                                                setSystemSettings((p) => ({
                                                    ...p,
                                                    secondReminderDays: parseInt(e.target.value) || 7,
                                                }))
                                            }
                                            className="h-9 text-sm"
                                        />
                                        <p className="text-[0.68rem] text-muted-foreground">
                                            e.g. 7 → Final reminder SMS sent 1 week before expiry
                                        </p>
                                    </div>
                                </div>

                                {/* Visual timeline */}
                                <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
                                    <p className="text-[0.68rem] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                        Notification Timeline
                                    </p>
                                    <div className="flex items-start gap-0">
                                        {[
                                            { dot: "bg-primary", label: "Sub Start", sub: "Day 0", color: "text-foreground" },
                                            {
                                                dot: "bg-amber-400",
                                                label: `−${systemSettings.firstReminderDays}d`,
                                                sub: "1st SMS",
                                                color: "text-amber-700",
                                            },
                                            {
                                                dot: "bg-orange-500",
                                                label: `−${systemSettings.secondReminderDays}d`,
                                                sub: "2nd SMS",
                                                color: "text-orange-700",
                                            },
                                            {
                                                dot: "bg-destructive",
                                                label: "Expiry",
                                                sub: "Expired SMS",
                                                color: "text-destructive",
                                            },
                                        ].map((item, i, arr) => (
                                            <div key={i} className="flex items-start flex-1">
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${item.dot} shrink-0`} />
                                                    <span
                                                        className={`text-[0.63rem] font-semibold mt-1 whitespace-nowrap ${item.color}`}
                                                    >
                                                        {item.label}
                                                    </span>
                                                    <span className="text-[0.6rem] text-muted-foreground">{item.sub}</span>
                                                </div>
                                                {i < arr.length - 1 && (
                                                    <div className="flex-1 h-px bg-border mt-1.5 mx-1" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <Button size="sm" onClick={handleSaveSystem} className="gap-2">
                                <Save size={14} /> {systemSaved ? "Saved!" : "Save Settings"}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Security Tab ────────────────────────────────────────────── */}
                <TabsContent value="security" className="space-y-4">
                    <Card className="border border-border shadow-sm">
                        <CardHeader className="border-b border-border py-4 px-5">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Shield size={16} /> Security Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-3">
                            {(
                                [
                                    {
                                        key: "twoFactor",
                                        label: "Two-factor authentication (2FA)",
                                        detail: "Require OTP on every login",
                                    },
                                    {
                                        key: "sessionTimeout",
                                        label: "Session timeout",
                                        detail: "Auto-logout after 30 minutes of inactivity",
                                    },
                                ] as { key: keyof typeof security; label: string; detail: string }[]
                            ).map((item) => (
                                <div
                                    key={item.key}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors"
                                >
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">{item.label}</p>
                                        <p className="text-[0.7rem] text-muted-foreground mt-0.5">{item.detail}</p>
                                    </div>
                                    <ToggleSwitch
                                        id={`sec-${item.key}`}
                                        checked={security[item.key]}
                                        onChange={(v) => setSecurity((p) => ({ ...p, [item.key]: v }))}
                                    />
                                </div>
                            ))}
                            <Separator />
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
                            >
                                <Shield size={14} /> Clear all active sessions
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
