"use client";

import { motion } from "framer-motion";

type BadgeData = { id: string; icon: string; title: string; description: string; unlocked: boolean };

export function BadgeGrid({ badges }: { badges: BadgeData[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" style={{ perspective: 900 }}>
      {badges.map((badge, i) => (
        <motion.div
          key={badge.id}
          initial={{ opacity: 0, rotateY: -90 }}
          animate={{ opacity: 1, rotateY: 0 }}
          transition={{ duration: 0.55, delay: i * 0.05, ease: "easeOut" }}
          style={{ transformStyle: "preserve-3d" }}
          className={`rounded-2xl border p-4 text-center transition-colors ${
            badge.unlocked ? "border-accent/30 bg-accent-soft" : "border-dashed border-border opacity-50 grayscale"
          }`}
        >
          <motion.span
            className="inline-block text-3xl"
            animate={badge.unlocked ? { rotate: [0, -8, 8, 0] } : {}}
            transition={{ duration: 0.6, delay: i * 0.05 + 0.3 }}
          >
            {badge.icon}
          </motion.span>
          <p className="mt-2 text-sm font-medium">{badge.title}</p>
          <p className="mt-1 text-xs text-foreground-muted">{badge.description}</p>
        </motion.div>
      ))}
    </div>
  );
}
