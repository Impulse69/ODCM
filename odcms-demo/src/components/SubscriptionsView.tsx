"use client";

import { CreditCard, Check, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { subscriptions } from "@/data/dummy";

const plans = [
    {
        id: "basic",
        name: "Basic",
        price: 99,
        description: "Single vehicle tracking with standard alerts",
        features: ["1 Vehicle", "Real-time tracking", "Monthly reports", "Email support"],
        color: "border-zinc-200 bg-zinc-50",
        badge: "bg-zinc-100 text-zinc-600",
        button: "outline",
        popular: false,
    },
    {
        id: "standard",
        name: "Standard",
        price: 199,
        description: "Ideal for individuals with multiple vehicles",
        features: ["Up to 3 vehicles", "Real-time tracking", "Trakzee sync", "SMS alerts", "Priority email support"],
        color: "border-[#ED7D31]/40 bg-[#FFF5EC]",
        badge: "bg-orange-100 text-orange-700",
        button: "default",
        popular: false,
    },
    {
        id: "premium",
        name: "Premium",
        price: 299,
        description: "Advanced analytics & priority support",
        features: ["Up to 5 vehicles", "Advanced analytics", "Trakzee priority sync", "SMS + WhatsApp alerts", "Dedicated account manager"],
        color: "border-violet-300 bg-violet-50",
        badge: "bg-violet-100 text-violet-700",
        button: "default",
        popular: true,
    },
    {
        id: "fleet",
        name: "Fleet",
        price: 499,
        description: "Full-scale fleet management solution",
        features: ["Unlimited vehicles", "Fleet dashboard", "API access", "24/7 support", "Custom reports", "Bulk IMEI import"],
        color: "border-sky-300 bg-sky-50",
        badge: "bg-sky-100 text-sky-700",
        button: "default",
        popular: false,
    },
];

export default function SubscriptionsView() {
    const planCounts: Record<string, number> = {};
    subscriptions.forEach((s) => {
        planCounts[s.plan] = (planCounts[s.plan] ?? 0) + 1;
    });

    return (
        <div className="space-y-6 animate-fade-in-up" style={{ opacity: 0 }}>
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Subscription Plans</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Manage and overview all available subscription tiers
                </p>
            </div>

            {/* Usage summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {plans.map((p) => (
                    <Card key={p.id} className="border border-border shadow-sm">
                        <CardContent className="py-4 px-4">
                            <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground font-semibold">{p.name}</p>
                            <p className="text-2xl font-extrabold mt-1 text-foreground">{planCounts[p.name] ?? 0}</p>
                            <p className="text-[0.65rem] text-muted-foreground mt-0.5">active subscriptions</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Separator />

            {/* Plan cards */}
            <div>
                <h2 className="text-base font-bold mb-4 text-foreground">Available Plans</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {plans.map((plan) => (
                        <Card
                            key={plan.id}
                            className={`relative border-2 ${plan.color} shadow-sm transition-shadow hover:shadow-md`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <Badge className="gap-1 bg-primary text-white text-[0.65rem] font-bold shadow-md">
                                        <Star size={10} fill="white" /> Most Popular
                                    </Badge>
                                </div>
                            )}
                            <CardHeader className="pt-6 pb-3">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className={`text-[0.65rem] font-bold px-2 py-0.5 ${plan.badge}`}>
                                        {plan.name}
                                    </Badge>
                                    <CreditCard size={16} className="text-muted-foreground" />
                                </div>
                                <CardTitle className="text-2xl font-extrabold mt-3">
                                    GH₵ {plan.price}
                                    <span className="text-sm font-medium text-muted-foreground">/mo</span>
                                </CardTitle>
                                <CardDescription className="text-xs">{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <ul className="space-y-2 mb-5">
                                    {plan.features.map((f) => (
                                        <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                                            <Check size={13} className="text-emerald-500 flex-shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Button
                                    size="sm"
                                    variant={plan.button as "default" | "outline"}
                                    className="w-full text-xs h-8"
                                >
                                    Assign Plan
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
