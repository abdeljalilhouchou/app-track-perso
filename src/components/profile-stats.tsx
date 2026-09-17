"use client";

import { TiltCard } from "@/components/ui/tilt-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";

export function ProfileStats({
  stats,
}: {
  stats: { label: string; value: number; color: string }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <TiltCard key={s.label} className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-foreground-muted">{s.label}</p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: s.color }}>
            <AnimatedCounter value={s.value} />
          </p>
        </TiltCard>
      ))}
    </div>
  );
}
