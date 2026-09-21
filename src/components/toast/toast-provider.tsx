"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

export type ToastKind = "success" | "error" | "warning" | "info";

type ToastAction = { label: string; onClick: () => unknown };

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
  title?: string;
  action?: ToastAction;
  duration: number;
};

type ToastOptions = { title?: string; action?: ToastAction; duration?: number };

export type ToastApi = {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const KIND = {
  success: { color: "var(--success)", label: "Succès", duration: 3800 },
  error: { color: "var(--danger)", label: "Erreur", duration: 7000 },
  warning: { color: "var(--mood)", label: "Attention", duration: 6000 },
  info: { color: "var(--accent)", label: "Info", duration: 4500 },
} as const;

const MAX_VISIBLE = 4;

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function KindIcon({ kind }: { kind: ToastKind }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      {kind === "success" && (
        <motion.path
          {...common}
          d="M5 12.5l4.5 4.5L19 7.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.12 }}
        />
      )}
      {kind === "error" && (
        <>
          <motion.path {...common} d="M6 6l12 12" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25, delay: 0.1 }} />
          <motion.path {...common} d="M18 6L6 18" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25, delay: 0.25 }} />
        </>
      )}
      {kind === "warning" && (
        <>
          <path {...common} d="M12 6.5v7" />
          <circle cx="12" cy="17.5" r="1" fill="currentColor" stroke="none" />
        </>
      )}
      {kind === "info" && (
        <>
          <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
          <path {...common} d="M12 11v6.5" />
        </>
      )}
    </svg>
  );
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const { color } = KIND[item.kind];

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      role={item.kind === "error" ? "alert" : "status"}
      className="group pointer-events-auto relative w-full overflow-hidden rounded-2xl border-[1.5px] bg-surface shadow-xl"
      style={{ borderColor: `color-mix(in srgb, ${color} 55%, var(--border))` }}
    >
      <div className="flex items-start gap-3 p-3.5 pr-9">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `color-mix(in srgb, ${color} 16%, transparent)`,
            color,
            animation:
              item.kind === "error"
                ? "shake 0.5s ease-in-out"
                : item.kind === "warning"
                  ? "pulse-ring 1.1s ease-out 2"
                  : undefined,
          }}
        >
          <KindIcon kind={item.kind} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight" style={{ color }}>
            {item.title ?? KIND[item.kind].label}
          </p>
          <p className="mt-0.5 text-sm leading-snug text-foreground">{item.message}</p>
          {item.action && (
            <button
              type="button"
              onClick={async () => {
                onDismiss();
                await item.action!.onClick();
              }}
              className="mt-1.5 rounded-md px-2 py-1 text-xs font-semibold transition hover:bg-surface-muted"
              style={{ color }}
            >
              {item.action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer le message"
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs text-foreground-muted transition hover:bg-surface-muted hover:text-foreground"
        >
          ✕
        </button>
      </div>
      {/* The bar's own animation end dismisses the toast; hovering pauses it. */}
      <div className="h-[3px] w-full bg-surface-muted">
        <div
          className="toast-bar h-full group-hover:[animation-play-state:paused]"
          onAnimationEnd={onDismiss}
          style={{ background: color, animation: `toast-shrink ${item.duration}ms linear forwards` }}
        />
      </div>
    </motion.li>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const isClient = useIsClient();

  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), []);

  const push = useCallback((kind: ToastKind, message: string, options?: ToastOptions) => {
    const id = Date.now() + Math.random();
    setItems((prev) => {
      // Identical message already showing: don't stack duplicates
      if (prev.some((t) => t.kind === kind && t.message === message)) return prev;
      const next = [...prev, { id, kind, message, title: options?.title, action: options?.action, duration: options?.duration ?? KIND[kind].duration }];
      return next.slice(-MAX_VISIBLE);
    });
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, o) => push("success", m, o),
      error: (m, o) => push("error", m, o),
      warning: (m, o) => push("warning", m, o),
      info: (m, o) => push("info", m, o),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {isClient &&
        createPortal(
          <div
            aria-live="polite"
            className="pointer-events-none fixed inset-x-3 top-3 z-[200] flex justify-center md:inset-x-auto md:right-4 md:top-4 md:w-[24rem] md:justify-end"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <ul className="flex w-full max-w-md flex-col gap-2">
              <AnimatePresence initial={false}>
                {items.map((t) => (
                  <Toast key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
                ))}
              </AnimatePresence>
            </ul>
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
