"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useT } from "@/components/language-provider";

type TabId = "today" | "journal" | "recipes";

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
  const t = useT();

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: "today", label: t("tabs.nutrition.today"), icon: "📅" },
    { id: "journal", label: t("tabs.nutrition.journal"), icon: "📒" },
    { id: "recipes", label: t("tabs.nutrition.recipes"), icon: "📖" },
  ];

  return (
    <div>
      <div
        role="tablist"
        className="mb-6 grid w-full grid-cols-3 gap-1 rounded-xl border border-nutrition/40 bg-surface-muted p-1 sm:inline-grid sm:w-auto"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className="relative min-w-0 rounded-lg px-2 py-2 text-sm font-medium transition-colors sm:px-4"
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
            <span className="relative flex flex-col items-center gap-0.5 sm:flex-row sm:justify-center sm:gap-1.5">
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="w-full truncate text-center text-[11px] leading-tight sm:w-auto sm:text-sm">{tab.label}</span>
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
