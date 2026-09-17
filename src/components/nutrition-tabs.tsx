"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";

const TABS = [
  { id: "today", label: "Aujourd'hui", icon: "📅" },
  { id: "trends", label: "Tendances", icon: "📈" },
  { id: "recipes", label: "Recettes", icon: "📖" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function NutritionTabs({
  today,
  trends,
  recipes,
}: {
  today: ReactNode;
  trends: ReactNode;
  recipes: ReactNode;
}) {
  const [active, setActive] = useState<TabId>("today");
  const content = { today, trends, recipes }[active];

  return (
    <div>
      <div className="mb-6 inline-flex gap-1 rounded-xl border border-border bg-surface-muted p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className="relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
            style={{ color: active === tab.id ? "white" : "var(--foreground-muted)" }}
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
