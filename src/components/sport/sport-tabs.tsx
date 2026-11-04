"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
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
    document.getElementById(`sport-tab-${target.id}`)?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={t("pages.sport.title")}
        className="mb-6 grid w-full grid-cols-5 gap-1 rounded-xl border border-sport/40 bg-surface-muted p-1 sm:inline-grid sm:w-auto"
      >
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            id={`sport-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-label={tab.label}
            aria-controls={`sport-panel-${tab.id}`}
            aria-selected={active === tab.id}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
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
              <span aria-hidden className="text-base leading-none">{tab.icon}</span>
              <span aria-hidden className="w-full truncate text-center text-[10px] leading-tight sm:w-auto sm:text-sm">
                <span className="sm:hidden">{t(`tabs.sport.${tab.id}Short`)}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
      {/* Every panel stays mounted so a session in progress survives switching tabs */}
      {TABS.map((tab) => (
        <div
          key={tab.id}
          id={`sport-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`sport-tab-${tab.id}`}
          tabIndex={0}
          hidden={active !== tab.id}
          className={active === tab.id ? "animate-fade-in space-y-6" : "space-y-6"}
        >
          {panels[tab.id]}
        </div>
      ))}
    </div>
  );
}
