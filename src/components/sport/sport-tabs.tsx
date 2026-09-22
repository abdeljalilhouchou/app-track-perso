"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useT } from "@/components/language-provider";

export type SportTabId = "session" | "program" | "progress" | "history" | "stats";

export function SportTabs({
  panels,
  initialTab = "session",
}: {
  panels: Record<SportTabId, ReactNode>;
  initialTab?: SportTabId;
}) {
  const [active, setActive] = useState<SportTabId>(initialTab);
  const t = useT();

  const TABS: { id: SportTabId; label: string; icon: string }[] = [
    { id: "session", label: t("tabs.sport.session"), icon: "🏋️" },
    { id: "program", label: t("tabs.sport.program"), icon: "📋" },
    { id: "progress", label: t("tabs.sport.progress"), icon: "📈" },
    { id: "history", label: t("tabs.sport.history"), icon: "📅" },
    { id: "stats", label: t("tabs.sport.stats"), icon: "📊" },
  ];

  return (
    <div>
      <div
        role="tablist"
        className="mb-6 grid w-full grid-cols-5 gap-1 rounded-xl border border-sport/40 bg-surface-muted p-1 sm:inline-grid sm:w-auto"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className="relative min-w-0 rounded-lg px-1 py-2 text-sm font-medium transition-colors sm:px-3.5"
            style={{ color: active === tab.id ? "var(--on-accent)" : "var(--foreground-muted)" }}
          >
            {active === tab.id && (
              <motion.span
                layoutId="sport-tab-bg"
                className="absolute inset-0 rounded-lg"
                style={{ background: "var(--sport)" }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              />
            )}
            <span className="relative flex flex-col items-center gap-0.5 sm:flex-row sm:justify-center sm:gap-1.5">
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="w-full truncate text-center text-[10px] leading-tight sm:w-auto sm:text-sm">{tab.label}</span>
            </span>
          </button>
        ))}
      </div>
      {/* Every panel stays mounted so a session in progress survives switching tabs */}
      {TABS.map((tab) => (
        <div key={tab.id} hidden={active !== tab.id} className={active === tab.id ? "animate-fade-in space-y-6" : "space-y-6"}>
          {panels[tab.id]}
        </div>
      ))}
    </div>
  );
}
