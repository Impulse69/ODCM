"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Zap } from "lucide-react";

export default function SystemAlert() {
    return (
        <Card className="border border-orange-200 bg-orange-50 shadow-sm">
            <CardContent className="pt-6 pb-6 px-6">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-orange-100 rounded-lg">
                        <Zap size={20} className="text-orange-600" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-sm">System Alert</h3>
                        <p className="text-sm text-muted-foreground mt-1">24 licenses expire in 48h</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
