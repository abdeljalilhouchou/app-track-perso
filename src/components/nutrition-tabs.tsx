"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";

const TABS = [
  { id: "today", label: "Aujourd'hui", icon: "📅" },
  { id: "journal", label: "Journal & tendances", icon: "📒" },
  { id: "recipes", label: "Recettes", icon: "📖" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function NutritionTabs({
  today,
  journal,
  recipes,
  initialTab = "today",
}: {
  today: ReactNode;
  journal: ReactNode;
  recipes: ReactNode;
  initialTab?: TabId;
}) {
  const [active, setActive] = useState<TabId>(initialTab);
  const content = { today, journal, recipes }[active];

  return (
    <div>
      <div className="mb-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-nutrition/40 bg-surface-muted p-1">
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
                layoutId="nutrition-tab-bg"
                className="absolute inset-0 rounded-lg"
                style={{ background: "var(--nutrition)" }}
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
      <motion.div
        key={active}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="space-y-6"
      >
        {content}
      </motion.div>
    </div>
  );
}
