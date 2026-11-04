"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
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

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const direction = document.documentElement.dir === "rtl" ? -1 : 1;
    const targetIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? TABS.length - 1
          : event.key === "ArrowRight"
            ? (index + direction + TABS.length) % TABS.length
            : event.key === "ArrowLeft"
              ? (index - direction + TABS.length) % TABS.length
              : -1;
    if (targetIndex < 0) return;
    event.preventDefault();
    const target = TABS[targetIndex];
    setActive(target.id);
    document.getElementById(`nutrition-tab-${target.id}`)?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={t("pages.nutrition.title")}
        className="mb-6 grid w-full grid-cols-3 gap-1 rounded-xl border border-nutrition/40 bg-surface-muted p-1 sm:inline-grid sm:w-auto"
      >
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            id={`nutrition-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-label={tab.label}
            aria-controls="nutrition-panel"
            aria-selected={active === tab.id}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
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
              <span aria-hidden className="text-base leading-none">{tab.icon}</span>
              <span aria-hidden className="w-full truncate text-center text-[11px] leading-tight sm:w-auto sm:text-sm">
                <span className="sm:hidden">{t(`tabs.nutrition.${tab.id}Short`)}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
      <motion.div
        key={active}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        id="nutrition-panel"
        role="tabpanel"
        aria-labelledby={`nutrition-tab-${active}`}
        tabIndex={0}
        className="space-y-6"
      >
        {content}
      </motion.div>
    </div>
  );
}
