"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up from 0 (or the previous value) to `value` whenever it changes. */
export function AnimatedCounter({ value, duration = 900 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    const from = mountedRef.current ? fromRef.current : 0;
    mountedRef.current = true;
    const start = performance.now();

    let raf: number;
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (value - from) * eased);
      setDisplay(current);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display.toLocaleString("fr-FR")}</>;
}
