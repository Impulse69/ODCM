"use client";

import { AuthProvider } from "@/lib/auth-context";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
        </AuthProvider>
    );
}
