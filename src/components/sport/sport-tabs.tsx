"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";

const TABS = [
  { id: "session", label: "Séance", icon: "🏋️" },
  { id: "program", label: "Programme", icon: "📋" },
  { id: "progress", label: "Progression", icon: "📈" },
  { id: "history", label: "Historique", icon: "📅" },
  { id: "stats", label: "Stats", icon: "📊" },
] as const;

export type SportTabId = (typeof TABS)[number]["id"];

export function SportTabs({
  panels,
  initialTab = "session",
}: {
  panels: Record<SportTabId, ReactNode>;
  initialTab?: SportTabId;
}) {
  const [active, setActive] = useState<SportTabId>(initialTab);

  return (
    <div>
      <div className="mb-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-sport/40 bg-surface-muted p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className="relative shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-3.5"
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
            <span className="relative flex items-center gap-1.5">
              <span>{tab.icon}</span>
              {tab.label}
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
