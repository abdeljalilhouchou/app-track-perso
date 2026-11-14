"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { IntroTexts } from "./anatomy-intro";
import type { IntroKind, MuscleKey } from "./anatomy-intro-scene";

// Kept here, not imported from the scene, so the login page does not pull in Three.js.
const MUSCLE_KEYS = ["deltoids", "chest", "biceps", "abs", "obliques", "forearms", "quadriceps", "tibialis", "traps", "triceps", "lats", "lowerBack", "glutes", "hamstrings", "calves"] as const satisfies readonly MuscleKey[];

/** Builds the intro's wording from either translator (the auth pages' or the app's). */
export function introTexts(t: (key: string) => string, status: string): IntroTexts {
  return {
    status,
    skip: t("auth.intro.skip"),
    muscles: Object.fromEntries(MUSCLE_KEYS.map((key) => [key, t(`auth.intro.muscles.${key}`)])) as Record<MuscleKey, string>,
  };
}

const AnatomyIntro = dynamic(() => import("./anatomy-intro"), { ssr: false, loading: () => <div className="anatomy-intro" aria-hidden="true" /> });

// The full sequence plays the first time on a device, then a shorter one.
const SEEN_KEY = "track-perso:anatomy-intro-seen-v1";
// Never hold the screen longer than this waiting for a navigation that does not come.
const MAX_WAIT_MS = 20000;

type Mode = "login" | "logout";
type Transition = { id: number; kind: IntroKind; texts: IntroTexts; from: string };
type AuthTransitionApi = { start: (mode: Mode, texts: IntroTexts) => void; cancel: () => void };

const AuthTransitionContext = createContext<AuthTransitionApi>({ start: () => {}, cancel: () => {} });

export function useAuthTransition() {
  return useContext(AuthTransitionContext);
}

function introKind(): IntroKind {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return "reduced";
  try {
    if (localStorage.getItem(SEEN_KEY)) return "short";
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Storage unavailable: play the short sequence rather than the long one every time.
    return "short";
  }
  return "full";
}

/** Lives in the root layout so the intro outlasts the redirect that sign-in and sign-out perform. */
export function AuthTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [transition, setTransition] = useState<Transition | null>(null);
  const next = useRef(0);

  const start = useCallback((_mode: Mode, texts: IntroTexts) => {
    next.current += 1;
    setTransition({ id: next.current, kind: introKind(), texts, from: window.location.pathname });
  }, []);
  const cancel = useCallback(() => setTransition(null), []);

  useEffect(() => {
    if (!transition) return;
    const timeout = window.setTimeout(() => setTransition(null), MAX_WAIT_MS);
    return () => window.clearTimeout(timeout);
  }, [transition]);

  const api = useMemo(() => ({ start, cancel }), [start, cancel]);
  return <AuthTransitionContext.Provider value={api}>
    {children}
    {transition && <AnatomyIntro key={transition.id} kind={transition.kind} texts={transition.texts} ready={pathname !== transition.from} onFinished={cancel} />}
  </AuthTransitionContext.Provider>;
}
