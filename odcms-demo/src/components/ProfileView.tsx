"use client";

import { useState } from "react";
import { User, Mail, Phone, Shield, Save, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function ProfileView() {
    const [form, setForm] = useState({
        fullName: "System Administrator",
        email: "admin@odg.com.gh",
        phone: "+233 24 000 0001",
        role: "Master Authority",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div className="space-y-5 animate-fade-in-up max-w-2xl" style={{ opacity: 0 }}>
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Admin Profile</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Manage your account details and credentials</p>
            </div>

            {/* Avatar card */}
            <Card className="border border-border shadow-sm">
                <CardContent className="p-5">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <Avatar className="w-16 h-16">
                                <AvatarFallback className="bg-gradient-to-br from-[#ED7D31] to-[#C9651B] text-white text-xl font-bold">
                                    AD
                                </AvatarFallback>
                            </Avatar>
                            <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors">
                                <Camera size={11} />
                            </button>
                        </div>
                        <div>
                            <p className="font-bold text-base text-foreground">{form.fullName}</p>
                            <p className="text-sm text-muted-foreground">{form.email}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                                <Badge className="gap-1 text-[0.65rem] font-semibold bg-primary/10 text-primary border-primary/20" variant="outline">
                                    <Shield size={10} /> {form.role}
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
                                <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
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
                                />
                            </div>
                        </div>
                    </div>
                    <Button onClick={handleSave} size="sm" className="gap-2">
                        <Save size={14} /> {saved ? "Saved!" : "Save Changes"}
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
                            value={form.currentPassword}
                            onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
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
                                value={form.newPassword}
                                onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                                className="h-9 text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Confirm New Password</Label>
                            <Input
                                type="password"
                                value={form.confirmPassword}
                                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                                className="h-9 text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    <Button size="sm" variant="outline" className="gap-2">
                        <Shield size={14} /> Update Password
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
