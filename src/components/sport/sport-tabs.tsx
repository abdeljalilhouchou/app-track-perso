"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useT } from "@/components/language-provider";

import type { SportTabId } from "@/lib/sport-navigation";
export type { SportTabId } from "@/lib/sport-navigation";

export function SportTabs({
  panels,
  initialTab = "session",
}: {
  panels: Record<SportTabId, ReactNode>;
  initialTab?: SportTabId;
}) {
  const [active, setActive] = useState<SportTabId>(initialTab);
  const [visited, setVisited] = useState<SportTabId[]>([initialTab]);
  const [previousInitialTab, setPreviousInitialTab] = useState(initialTab);
  const t = useT();

  // A query-string shortcut may update this page without unmounting it.
  // Adjust only the selection; keep visited panels and the live draft mounted.
  if (previousInitialTab !== initialTab) {
    setPreviousInitialTab(initialTab);
    setActive(initialTab);
    setVisited((current) => current.includes(initialTab) ? current : [...current, initialTab]);
  }

  function activate(tab: SportTabId) {
    setVisited((current) => current.includes(tab) ? current : [...current, tab]);
    setActive(tab);
  }

  const TABS: { id: SportTabId; label: string }[] = [
    { id: "session", label: t("tabs.sport.session") },
    { id: "program", label: t("tabs.sport.program") },
    { id: "progress", label: t("tabs.sport.progress") },
    { id: "history", label: t("tabs.sport.history") },
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
    activate(target.id);
    document.getElementById(`sport-tab-${target.id}`)?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={t("pages.sport.title")}
        className="mb-5 grid w-full grid-cols-4 gap-1 rounded-2xl border border-border bg-surface p-1 sm:max-w-lg"
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
            onClick={() => activate(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            className="relative min-h-[38px] min-w-0 rounded-xl px-1 text-[13px] font-semibold transition-colors"
            style={{ color: active === tab.id ? "#062016" : "var(--foreground-muted)" }}
          >
            {active === tab.id && (
              <motion.span
                layoutId="sport-tab-bg"
                className="absolute inset-0 rounded-xl"
                style={{ background: "var(--sport)" }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              />
            )}
            <span aria-hidden className="relative block truncate text-center">{tab.label}</span>
          </button>
        ))}
      </div>
      {/* Mount on first visit, then retain state, including unsaved sessions. */}
      {TABS.map((tab) => (
        <div
          key={tab.id}
          id={`sport-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`sport-tab-${tab.id}`}
          hidden={active !== tab.id}
          className={active === tab.id ? "animate-fade-in space-y-6" : "space-y-6"}
        >
          {visited.includes(tab.id) ? panels[tab.id] : null}
        </div>
      ))}
    </div>
  );
}
