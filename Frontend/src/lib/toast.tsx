"use client";

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
    type ReactNode,
} from "react";
import { CheckCircle2, XCircle, AlertCircle, X } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info";

interface ToastItem {
    id: number;
    type: ToastType;
    title: string;
    description?: string;
}

interface ToastContextValue {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
}

// ── Context ────────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const counter = useRef(0);

    const dismiss = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const push = useCallback(
        (type: ToastType, title: string, description?: string) => {
            const id = ++counter.current;
            setToasts((prev) => [...prev, { id, type, title, description }]);
            setTimeout(() => dismiss(id), 4000);
        },
        [dismiss],
    );

    const ctx: ToastContextValue = {
        success: (t, d) => push("success", t, d),
        error:   (t, d) => push("error",   t, d),
        info:    (t, d) => push("info",    t, d),
    };

    const icons: Record<ToastType, ReactNode> = {
        success: <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />,
        error:   <XCircle      size={15} className="text-red-500 shrink-0 mt-0.5" />,
        info:    <AlertCircle  size={15} className="text-blue-500 shrink-0 mt-0.5" />,
    };

    const borders: Record<ToastType, string> = {
        success: "border-emerald-200",
        error:   "border-red-200",
        info:    "border-blue-200",
    };

    return (
        <ToastContext.Provider value={ctx}>
            {children}

            {/* Portal-style fixed overlay */}
            <div
                aria-live="polite"
                className="fixed bottom-5 right-5 z-9999 flex flex-col gap-2 pointer-events-none"
                style={{ minWidth: 280, maxWidth: 360 }}
            >
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`flex items-start gap-3 bg-background border ${borders[t.type]} rounded-xl px-4 py-3 shadow-lg pointer-events-auto animate-fade-in-up`}
                        style={{ opacity: 0, animationFillMode: "forwards" }}
                    >
                        {icons[t.type]}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground leading-snug">{t.title}</p>
                            {t.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                            )}
                        </div>
                        <button
                            onClick={() => dismiss(t.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 shrink-0"
                        >
                            <X size={13} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
    return ctx;
}
