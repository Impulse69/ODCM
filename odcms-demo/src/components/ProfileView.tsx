"use client";

import { useState } from "react";
import { User as UserIcon, Mail, Phone, Shield, Save, Camera, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth, getAuthToken } from "@/lib/auth-context";

const API_BASE = "http://localhost:5000/api/auth";

export default function ProfileView() {
    const { user, refreshUser } = useAuth();

    const [form, setForm] = useState({
        fullName: user?.name ?? "",
        email: user?.email ?? "",
        phone: user?.phone ?? "",
        role: user?.role ?? "",
    });
    const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [saving, setSaving] = useState(false);

    const [pwForm, setPwForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [changingPw, setChangingPw] = useState(false);

    const handleSaveProfile = async () => {
        setProfileMsg(null);
        setSaving(true);
        try {
            const token = getAuthToken();
            const res = await fetch(`${API_BASE}/profile`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ name: form.fullName, email: form.email, phone: form.phone }),
            });
            const data = await res.json();
            if (!res.ok) {
                setProfileMsg({ type: "error", text: data.message || "Failed to update profile" });
            } else {
                const updated = data.data;
                refreshUser(updated);
                setForm({
                    fullName: updated.name ?? "",
                    email: updated.email ?? "",
                    phone: updated.phone ?? "",
                    role: updated.role ?? "",
                });
                setProfileMsg({ type: "success", text: "Profile updated successfully" });
            }
        } catch {
            setProfileMsg({ type: "error", text: "Network error — is the server running?" });
        } finally {
            setSaving(false);
            setTimeout(() => setProfileMsg(null), 3000);
        }
    };

    const handleChangePassword = async () => {
        setPwMsg(null);
        if (pwForm.newPassword !== pwForm.confirmPassword) {
            setPwMsg({ type: "error", text: "Passwords do not match" });
            return;
        }
        if (pwForm.newPassword.length < 6) {
            setPwMsg({ type: "error", text: "New password must be at least 6 characters" });
            return;
        }
        setChangingPw(true);
        try {
            const token = getAuthToken();
            const res = await fetch(`${API_BASE}/password`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
            });
            const data = await res.json();
            if (!res.ok) {
                setPwMsg({ type: "error", text: data.message || "Failed to change password" });
            } else {
                setPwMsg({ type: "success", text: "Password updated successfully" });
                setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
            }
        } catch {
            setPwMsg({ type: "error", text: "Network error — is the server running?" });
        } finally {
            setChangingPw(false);
            setTimeout(() => setPwMsg(null), 3000);
        }
    };

    const initials = user?.initials ?? "??";

    return (
        <div className="space-y-5 animate-fade-in-up max-w-2xl" style={{ opacity: 0 }}>
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Profile</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Manage your account details and credentials</p>
            </div>

            {/* Avatar card */}
            <Card className="border border-border shadow-sm">
                <CardContent className="p-5">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <Avatar className="w-16 h-16">
                                <AvatarFallback className="bg-linear-to-br from-odg-orange to-odg-orange-dark text-white text-xl font-bold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors">
                                <Camera size={11} />
                            </button>
                        </div>
                        <div>
                            <p className="font-bold text-base text-foreground">{user?.name}</p>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                                <Badge className="gap-1 text-[0.65rem] font-semibold bg-primary/10 text-primary border-primary/20" variant="outline">
                                    <Shield size={10} /> {user?.role}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Edit profile */}
            <Card className="border border-border shadow-sm">
                <CardHeader className="border-b border-border py-4 px-5">
                    <CardTitle className="text-base">Personal Information</CardTitle>
                    <CardDescription className="text-xs">Update your account details</CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Full Name</Label>
                            <div className="relative">
                                <UserIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={form.fullName}
                                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                                    className="pl-7 h-9 text-sm"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Role</Label>
                            <Input value={form.role} readOnly className="h-9 text-sm bg-muted/50 text-muted-foreground" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Email Address</Label>
                            <div className="relative">
                                <Mail size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={form.email}
                                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                    className="pl-7 h-9 text-sm"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Phone Number</Label>
                            <div className="relative">
                                <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={form.phone}
                                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                                    className="pl-7 h-9 text-sm"
                                    placeholder="e.g. +233 24 000 0001"
                                />
                            </div>
                        </div>
                    </div>
                    {profileMsg && (
                        <div className={`flex items-center gap-2 text-sm ${profileMsg.type === "success" ? "text-green-600" : "text-destructive"}`}>
                            {profileMsg.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                            {profileMsg.text}
                        </div>
                    )}
                    <Button onClick={handleSaveProfile} size="sm" className="gap-2" disabled={saving || !form.fullName.trim() || !form.email.trim()}>
                        <Save size={14} /> {saving ? "Saving…" : "Save Changes"}
                    </Button>
                </CardContent>
            </Card>

            {/* Change password */}
            <Card className="border border-border shadow-sm">
                <CardHeader className="border-b border-border py-4 px-5">
                    <CardTitle className="text-base">Change Password</CardTitle>
                    <CardDescription className="text-xs">Update your login credentials</CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Current Password</Label>
                        <Input
                            type="password"
                            value={pwForm.currentPassword}
                            onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                            className="h-9 text-sm"
                            placeholder="••••••••"
                        />
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">New Password</Label>
                            <Input
                                type="password"
                                value={pwForm.newPassword}
                                onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                                className="h-9 text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Confirm New Password</Label>
                            <Input
                                type="password"
                                value={pwForm.confirmPassword}
                                onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                                className="h-9 text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    {pwMsg && (
                        <div className={`flex items-center gap-2 text-sm ${pwMsg.type === "success" ? "text-green-600" : "text-destructive"}`}>
                            {pwMsg.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                            {pwMsg.text}
                        </div>
                    )}
                    <Button onClick={handleChangePassword} size="sm" variant="outline" className="gap-2" disabled={changingPw || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}>
                        <Shield size={14} /> {changingPw ? "Updating…" : "Update Password"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
