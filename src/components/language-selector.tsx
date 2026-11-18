"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/components/language-provider";
import type { Language } from "@/lib/language";

const OPTIONS: { value: Language; label: string; flag: string }[] = [
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "ar", label: "العربية", flag: "🇲🇦" },
];

export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div role="radiogroup" aria-label={t("language.title")} className="grid grid-cols-3 gap-2 sm:gap-3">
      {OPTIONS.map(({ value, label, flag }) => {
        const selected = language === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setLanguage(value)}
            className="relative flex min-h-11 flex-col items-center gap-1.5 rounded-2xl border-[1.5px] p-3 text-center transition-colors sm:flex-row sm:gap-2.5 sm:text-start"
            style={{
              borderColor: selected ? "var(--accent)" : "var(--border)",
              background: selected ? "var(--accent-soft)" : "var(--surface)",
            }}
          >
            {selected && (
              <motion.span
                layoutId="language-selected"
                className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-accent/40"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span aria-hidden className="text-2xl leading-none">{flag}</span>
            <p className={`text-sm font-medium ${selected ? "text-accent" : ""}`}>{label}</p>
          </button>
        );
      })}
    </div>
  );
}
