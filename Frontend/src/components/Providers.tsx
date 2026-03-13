"use client";

import { AuthProvider } from "@/lib/auth-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/lib/toast";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <TooltipProvider delayDuration={0}>
                <ToastProvider>
                    {children}
                </ToastProvider>
            </TooltipProvider>
        </AuthProvider>
    );
}
