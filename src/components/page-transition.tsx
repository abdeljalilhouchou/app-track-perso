"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

/**
 * A light fade-in on navigation. No AnimatePresence/exit: in the App Router, `children` (the new
 * page's Server Component tree) and `pathname` update in the same commit, so AnimatePresence never
 * gets a stable "old children" to play an exit animation for — it was leaving the page stuck blank
 * (opacity: 0) until a manual reload. Keying a plain motion.div just replays the enter animation.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
