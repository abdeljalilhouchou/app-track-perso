"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export type FeedItem = {
  id: string;
  type: "habit" | "sport" | "mood" | "moment";
  time: string;
  icon: string;
  title: string;
  subtitle?: string;
  href?: string;
};

const TYPE_META = {
  habit: { color: "var(--habit)", soft: "var(--habit-soft)", label: "Habitude" },
  sport: { color: "var(--sport)", soft: "var(--sport-soft)", label: "Sport" },
  mood: { color: "#b45309", soft: "var(--mood-soft)", label: "Humeur" },
  moment: { color: "var(--accent)", soft: "var(--accent-soft)", label: "Moment" },
} as const;

export function DayFeed({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-2xl">
          🗒️
        </span>
        <p className="text-sm text-foreground-muted">Rien d&apos;enregistré ce jour-là.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, i) => {
        const meta = TYPE_META[item.type];
        const content = (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
            className="flex items-start gap-3 rounded-2xl bg-surface-muted p-3.5"
            style={{ borderLeft: `3px solid ${meta.color}` }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-base"
              style={{ background: meta.soft }}
            >
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{item.title}</p>
              {item.subtitle && (
                <p className="mt-0.5 text-xs leading-relaxed text-foreground-muted">{item.subtitle}</p>
              )}
              <span
                className="mt-1 inline-block rounded-[5px] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
                style={{ background: meta.soft, color: meta.color }}
              >
                {meta.label}
              </span>
            </div>
            <span className="shrink-0 pt-0.5 text-xs text-foreground-muted">{item.time}</span>
          </motion.div>
        );

        return item.href ? (
          <Link key={item.id} href={item.href} className="transition hover:opacity-80">
            {content}
          </Link>
        ) : (
          <div key={item.id}>{content}</div>
        );
      })}
    </div>
  );
}
