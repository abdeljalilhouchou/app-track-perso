export const SPORT_TABS = ["session", "program", "progress", "history", "stats"] as const;
export type SportTabId = typeof SPORT_TABS[number];

export function sportTabFromQuery(tab: string | string[] | undefined, legacyDate?: string | string[]): SportTabId {
  const requested = Array.isArray(tab) ? tab[0] : tab;
  return SPORT_TABS.includes(requested as SportTabId) ? requested as SportTabId : legacyDate ? "history" : "session";
}
