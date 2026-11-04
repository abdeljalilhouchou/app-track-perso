"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

export function Dialog({
  open,
  onClose,
  children,
  widthClassName = "max-w-md",
  ariaLabel,
  ariaDescribedBy,
  role = "dialog",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  widthClassName?: string;
  ariaLabel: string;
  ariaDescribedBy?: string;
  role?: "dialog" | "alertdialog";
}) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // Portals need a browser `document`; this one-time mount flag avoids an
    // SSR/hydration mismatch (server and first client render must agree).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !mounted) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const panel = panelRef.current;
    const initialFocus = panel?.querySelector<HTMLElement>("[autofocus]") ?? panel?.querySelector<HTMLElement>(focusableSelector);
    const focusFrame = requestAnimationFrame(() => (initialFocus ?? panel)?.focus());

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.getClientRects().length > 0
      );
      if (focusable.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, mounted]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-100 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            ref={panelRef}
            role={role}
            aria-modal="true"
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            tabIndex={-1}
            className={`fixed inset-x-0 bottom-0 z-101 mx-auto max-h-[calc(100dvh-1rem)] w-[min(100vw,32rem)] overflow-y-auto overscroll-contain rounded-t-3xl bg-surface shadow-2xl md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[85dvh] md:w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl ${widthClassName}`}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
