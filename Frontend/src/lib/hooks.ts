"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Returns [ref, inView].
 * `inView` becomes true (and stays true) once the element intersects the viewport.
 * Pass `threshold` (0–1) to control how much of the element must be visible.
 */
export function useInView<T extends Element>(threshold = 0.15) {
    const ref = useRef<T>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect(); // fire once, stay true
                }
            },
            { threshold }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold]);

    return [ref, inView] as const;
}
