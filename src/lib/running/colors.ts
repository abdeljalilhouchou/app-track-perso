import type { RunType } from "./stats";

/** One colour per kind of run, used by chips, tags and the type split. */
export const RUN_TYPE_COLORS: Record<RunType, string> = {
  // Literal green: the Running page redefines --sport as its blue accent.
  easy: "#34d399",
  endurance: "var(--water)",
  long: "var(--habit)",
  tempo: "var(--nutrition)",
  interval: "#f472b6",
  recovery: "#14b8a6",
  free: "var(--foreground-muted)",
  race: "var(--mood)",
};
