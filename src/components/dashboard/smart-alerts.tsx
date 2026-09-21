"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Callout } from "@/components/ui/callout";
import { buildAlerts, type AlertFacts } from "@/lib/alerts";

/**
 * Notes and warnings derived from today's data. Time-of-day rules use the user's own clock
 * (the server runs in UTC), and each alert can be dismissed for the day.
 */
export function SmartAlerts({ facts }: { facts: AlertFacts }) {
  const [clock] = useState(() => {
    const d = new Date();
    return { hour: d.getHours(), iso: d.getDay() === 0 ? 7 : d.getDay() };
  });

  const alerts = buildAlerts(facts, clock.hour, clock.iso);
  if (alerts.length === 0) return null;

  return (
    <section aria-label="Notes et alertes">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Notes &amp; alertes</h2>
      <div className="space-y-2.5">
        {alerts.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}>
            <Callout variant={a.variant} title={a.title} action={a.action} dismissKey={`alert:${a.id}:${facts.today}`} compact>
              {a.text}
            </Callout>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
