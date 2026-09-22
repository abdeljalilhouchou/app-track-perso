"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Full-screen 3D "signing" animation shown while a sign-in/sign-out is in flight. The stroke
 * loops (draw → hold → erase) instead of playing once, so it looks intentional whether the
 * underlying action takes 200ms or 2s — a one-shot animation would just get cut off mid-stroke.
 * Portaled to <body> so it stays viewport-fixed regardless of any transformed ancestor (same
 * fix as the Dialog component).
 */
export function SignatureOverlay({ show, label }: { show: boolean; label: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          key="signature-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[250] flex flex-col items-center justify-center"
          style={{ background: "var(--background)" }}
        >
          <div style={{ perspective: 900 }}>
            <motion.p
              className="text-3xl font-semibold tracking-tight"
              style={{ transformStyle: "preserve-3d" }}
              initial={{ rotateX: 75, opacity: 0, y: 12 }}
              animate={{ rotateX: 0, opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              track<span style={{ color: "var(--accent)" }}>.perso</span>
            </motion.p>
          </div>

          <svg width="220" height="56" viewBox="0 0 220 56" className="mt-3" aria-hidden>
            <motion.path
              d="M8 36 C 34 8, 60 52, 92 22 S 150 4, 184 30 S 205 40 212 26"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut", times: [0, 0.55, 0.85, 1], delay: 0.3 }}
            />
          </svg>

          <motion.p
            className="mt-2 text-sm text-foreground-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            {label}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
