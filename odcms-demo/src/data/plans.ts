// ─── Plans Data ─────────────────────────────────────────────────────────────────

export interface Plan {
    id: string;
    name: string;
    price: number;
    description: string;
    features: string[];
    color: string;
    badge: string;
    button: "default" | "outline";
    popular: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// Initial plans data
export const initialPlans: Plan[] = [
    {
        id: "plan_001",
        name: "Basic",
        price: 60,
        description: "Real-time GPS tracking, Location history, Standard monitoring features",
        features: ["Real-time GPS tracking", "Location history", "Standard monitoring features"],
        color: "border-zinc-200 bg-zinc-50",
        badge: "bg-zinc-100 text-zinc-600",
        button: "outline",
        popular: false,
        isActive: true,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
    },
    {
        id: "plan_002",
        name: "Standard",
        price: 100,
        description: "Remote engine cut-off (anti-theft), Real-time GPS tracking, Location history",
        features: ["Remote engine cut-off (anti-theft)", "Real-time GPS tracking", "Location history"],
        color: "border-[#ED7D31]/40 bg-[#FFF5EC]",
        badge: "bg-orange-100 text-orange-700",
        button: "default",
        popular: false,
        isActive: true,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
    },
    {
        id: "plan_003",
        name: "Premium",
        price: 300,
        description: "Voice monitoring feature, Real-time GPS tracking, Location history, Remote engine cut-off",
        features: ["Voice monitoring feature", "Real-time GPS tracking", "Location history", "Remote engine cut-off"],
        color: "border-violet-300 bg-violet-50",
        badge: "bg-violet-100 text-violet-700",
        button: "default",
        popular: true,
        isActive: true,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
    },
];

