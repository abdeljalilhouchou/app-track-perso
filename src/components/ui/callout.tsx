"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useT } from "@/components/language-provider";

export type CalloutVariant = "info" | "tip" | "warning" | "success" | "danger";

const VARIANTS: Record<CalloutVariant, { color: string; icon: string; labelKey: string }> = {
  info: { color: "var(--accent)", icon: "ℹ️", labelKey: "common.calloutInfo" },
  tip: { color: "var(--water)", icon: "💡", labelKey: "common.calloutTip" },
  warning: { color: "var(--mood)", icon: "⚠️", labelKey: "common.calloutWarning" },
  success: { color: "var(--success)", icon: "✅", labelKey: "common.calloutSuccess" },
  danger: { color: "var(--danger)", icon: "🚨", labelKey: "common.calloutDanger" },
};

const STORAGE_KEY = "dismissed-callouts";
const EVENT = "callouts-change";

function readDismissed(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function useDismissed(key: string | undefined) {
  const raw = useSyncExternalStore(
    (notify) => {
      window.addEventListener(EVENT, notify);
      window.addEventListener("storage", notify);
      return () => {
        window.removeEventListener(EVENT, notify);
        window.removeEventListener("storage", notify);
      };
    },
    readDismissed,
    // Until the client has read storage, a persistent callout stays hidden (avoids show-then-vanish flashes).
    () => null
  );

  if (!key) return { ready: true, dismissed: false };
  if (raw === null) return { ready: false, dismissed: false };
  try {
    return { ready: true, dismissed: (JSON.parse(raw) as string[]).includes(key) };
  } catch {
    return { ready: true, dismissed: false };
  }
}

function persistDismissal(key: string) {
  try {
    const list = JSON.parse(readDismissed()) as string[];
    if (!list.includes(key)) {
      // Keep the list bounded: alerts are dated, so old keys are useless
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...list, key].slice(-80)));
    }
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // storage unavailable: the callout just comes back on reload
  }
}

/**
 * A contextual note, tip or warning. Pass `dismissKey` to let the user close it for good
 * (include the date in the key for alerts that should come back tomorrow).
 */
export function Callout({
  variant = "info",
  title,
  children,
  dismissKey,
  action,
  compact = false,
  icon,
  className = "",
}: {
  variant?: CalloutVariant;
  title?: string;
  children: ReactNode;
  dismissKey?: string;
  action?: { label: string; href: string };
  compact?: boolean;
  icon?: string;
  className?: string;
}) {
  const v = VARIANTS[variant];
  const { ready, dismissed } = useDismissed(dismissKey);
  const visible = ready && !dismissed;
  const t = useT();

  return (
    <AnimatePresence initial>
      {visible && (
        <motion.aside
          role={variant === "danger" || variant === "warning" ? "alert" : "note"}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, transition: { duration: 0.2 } }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className={`flex items-start gap-3 overflow-hidden rounded-2xl border-[1.5px] ${compact ? "p-3" : "p-4"} ${className}`}
          style={{
            borderColor: `color-mix(in srgb, ${v.color} 50%, var(--border))`,
            background: `color-mix(in srgb, ${v.color} 8%, var(--surface))`,
          }}
        >
          <motion.span
            aria-hidden
            className="mt-0.5 shrink-0 text-lg leading-none"
            animate={variant === "warning" || variant === "danger" ? { rotate: [0, -12, 12, -8, 8, 0] } : { scale: [1, 1.18, 1] }}
            transition={{ duration: 0.7, delay: 0.25 }}
          >
            {icon ?? v.icon}
          </motion.span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: v.color }}>
              {title ?? t(v.labelKey)}
            </p>
            <div className="mt-0.5 text-foreground">{children}</div>
            {action && (
              <Link href={action.href} className="mt-1.5 inline-block text-xs font-semibold hover:underline" style={{ color: v.color }}>
                {action.label} →
              </Link>
            )}
          </div>
          {dismissKey && (
            <button
              type="button"
              onClick={() => persistDismissal(dismissKey)}
              aria-label={t("common.hideMessage")}
              className="shrink-0 rounded-full px-1.5 py-0.5 text-xs text-foreground-muted transition hover:bg-surface-muted hover:text-foreground"
            >
              ✕
            </button>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
