"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/avatar";
import { changePassword, saveAvatarUrl, updateDisplayName } from "@/lib/actions/account";
import { getReport } from "@/lib/actions/report";
import { useToast } from "@/components/toast/toast-provider";
import { downloadReportPdf } from "@/lib/report-pdf";
import { useT } from "@/components/language-provider";

const AVATAR_SIZE = 256;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

const input =
  "min-h-11 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30";
const primary =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent transition hover:opacity-90 disabled:opacity-50";
const outline =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium transition hover:bg-surface-muted disabled:opacity-50";

type Feedback = { kind: "ok" | "error"; text: string } | null;

/** Inline feedback (kept next to the field for errors) that also raises a toast on success. */
function useFeedback(): [Feedback, (f: Feedback) => void] {
  const toast = useToast();
  const [feedback, setFeedback] = useState<Feedback>(null);
  return [
    feedback,
    (f) => {
      setFeedback(f);
      if (f?.kind === "ok") toast.success(f.text);
    },
  ];
}

function Notice({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p role={feedback.kind === "error" ? "alert" : "status"} className="mt-2 text-xs" style={{ color: feedback.kind === "ok" ? "var(--success)" : "var(--danger)" }}>
      {feedback.text}
    </p>
  );
}

/** A titled group of settings: a small label above one card, as in system settings screens. */
export function SettingsSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h2 id={id} className="px-1 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{title}</h2>
      <div className="divide-y divide-border rounded-2xl border border-border bg-surface">{children}</div>
    </section>
  );
}

/** One row of a settings card. */
export function SettingsRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

/** Center-crops the picked image to a square and downsizes it to keep uploads tiny. */
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Conversion impossible"))), "image/jpeg", 0.85)
  );
}

/** The card at the top of Settings: photo, name, email and membership, with the photo actions. */
export function IdentityCard({ userId, name, email, avatarUrl, memberSinceYear }: { userId: string; name: string; email: string; avatarUrl: string | null; memberSinceYear: number }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState(avatarUrl);
  const [feedback, setFeedback] = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);

  function onPick(file: File | undefined) {
    if (!file) return;
    setFeedback(null);
    if (!file.type.startsWith("image/")) return setFeedback({ kind: "error", text: t("profile.account.chooseImageFile") });
    if (file.size > MAX_FILE_BYTES) return setFeedback({ kind: "error", text: t("profile.account.imageTooLarge") });

    startTransition(async () => {
      try {
        const blob = await toSquareJpeg(file);
        const supabase = createClient();
        const path = `${userId}/avatar.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
        if (uploadError) throw new Error(uploadError.message);

        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
        const result = await saveAvatarUrl(publicUrl);
        if (result.error) throw new Error(result.error);

        setUrl(publicUrl);
        setFeedback({ kind: "ok", text: t("profile.account.photoUpdated") });
      } catch (e) {
        const message = e instanceof Error ? e.message : t("profile.account.unknownError");
        setFeedback({ kind: "error", text: t("profile.account.photoUploadError", { message }) });
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  function remove() {
    setFeedback(null);
    startTransition(async () => {
      const supabase = createClient();
      await supabase.storage.from("avatars").remove([`${userId}/avatar.jpg`]);
      const result = await saveAvatarUrl(null);
      if (result.error) return setFeedback({ kind: "error", text: result.error });
      setUrl(null);
      setFeedback({ kind: "ok", text: t("profile.account.photoDeleted") });
    });
  }

  return (
    <div className="rounded-3xl border border-border bg-surface p-5" data-settings-identity>
      <div className="flex items-center gap-4">
        <Avatar name={name} url={url} size="xl" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{name}</p>
          <p className="truncate text-sm text-foreground-muted">{email}</p>
          <p className="mt-1 text-xs text-foreground-muted">{t("profile.settingsPage.memberSince", { year: memberSinceYear })}</p>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => onPick(e.target.files?.[0])} />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => fileRef.current?.click()} className={`${primary} flex-1`}>
          {pending ? t("profile.account.uploading") : url ? t("profile.account.changePhoto") : t("profile.account.addPhoto")}
        </button>
        {url && (
          <button type="button" disabled={pending} onClick={remove} className={outline}>
            {t("profile.account.removePhoto")}
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-foreground-muted">{t("profile.account.photoHint")}</p>
      <Notice feedback={feedback} />
    </div>
  );
}

export function NameSetting({ initialName }: { initialName: string }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(initialName);
  const [name, setName] = useState(initialName);
  const [feedback, setFeedback] = useFeedback();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setFeedback(null);
        startTransition(async () => {
          const result = await updateDisplayName(name);
          if (!result.error) setSaved(name.trim());
          setFeedback(result.error ? { kind: "error", text: result.error } : { kind: "ok", text: t("profile.account.nameUpdated") });
        });
      }}
    >
      <label htmlFor="settings-name" className="mb-1.5 block text-xs font-medium text-foreground-muted">{t("profile.account.nameLabel")}</label>
      <div className="flex gap-2">
        <input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required autoComplete="nickname" className={input} />
        <button type="submit" disabled={pending || name.trim() === saved} className={primary}>
          {t("profile.account.save")}
        </button>
      </div>
      <Notice feedback={feedback} />
    </form>
  );
}

export function EmailSetting({ email }: { email: string }) {
  const t = useT();
  return (
    <div>
      <label htmlFor="settings-email" className="mb-1.5 block text-xs font-medium text-foreground-muted">{t("profile.account.emailLabel")}</label>
      <input id="settings-email" type="email" value={email} readOnly className={`${input} text-foreground-muted`} />
    </div>
  );
}

/** Password change, folded away until asked for. */
export function PasswordSetting() {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const [feedback, setFeedback] = useFeedback();

  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        {t("profile.account.changePassword")}
        <span aria-hidden className="text-foreground-muted transition-transform group-open:rotate-90 rtl:rotate-180 rtl:group-open:rotate-90">›</span>
      </summary>
      <form
        key={formKey}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const current = String(data.get("current"));
          const next = String(data.get("next"));
          const confirm = String(data.get("confirm"));
          if (next !== confirm) return setFeedback({ kind: "error", text: t("profile.account.passwordMismatch") });

          setFeedback(null);
          startTransition(async () => {
            const result = await changePassword(current, next);
            if (result.error) return setFeedback({ kind: "error", text: result.error });
            setFormKey((k) => k + 1);
            setFeedback({ kind: "ok", text: t("profile.account.passwordChanged") });
          });
        }}
        className="mt-3 space-y-2"
      >
        <input name="current" type="password" required autoComplete="current-password" aria-label={t("profile.account.currentPassword")} placeholder={t("profile.account.currentPassword")} className={input} />
        <input name="next" type="password" required minLength={6} autoComplete="new-password" aria-label={t("profile.account.newPassword")} placeholder={t("profile.account.newPassword")} className={input} />
        <input name="confirm" type="password" required minLength={6} autoComplete="new-password" aria-label={t("profile.account.confirmPassword")} placeholder={t("profile.account.confirmPassword")} className={input} />
        <p className="text-xs text-foreground-muted">{t("profile.settingsPage.passwordHint")}</p>
        <button type="submit" disabled={pending} className={`${primary} w-full`}>
          {pending ? t("profile.account.changingPassword") : t("profile.account.changePassword")}
        </button>
        <Notice feedback={feedback} />
      </form>
    </details>
  );
}

const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Monthly or yearly PDF report. */
export function ReportSetting({ sinceYear }: { sinceYear: number }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useFeedback();
  const [now] = useState(() => new Date());
  const currentYear = now.getFullYear();
  const [mode, setMode] = useState<"month" | "year">("month");
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(now.getMonth() + 1);

  const firstYear = Math.min(sinceYear, currentYear);
  const years = Array.from({ length: currentYear - firstYear + 1 }, (_, i) => currentYear - i);
  const lastMonth = year === currentYear ? now.getMonth() + 1 : 12;
  const safeMonth = Math.min(month, lastMonth);

  function downloadPdf() {
    setFeedback(null);
    startTransition(async () => {
      try {
        const { data, error } = await getReport(mode === "month" ? { kind: "month", year, month: safeMonth } : { kind: "year", year });
        if (error || !data) return setFeedback({ kind: "error", text: error ?? t("profile.account.reportUnavailable") });
        await downloadReportPdf(data);
        setFeedback({ kind: "ok", text: t("profile.account.pdfDownloaded", { label: data.periodLabel }) });
      } catch (e) {
        setFeedback({ kind: "error", text: e instanceof Error ? e.message : t("profile.account.pdfError") });
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground-muted">{t("profile.settingsPage.reportHint")}</p>
      <div role="radiogroup" aria-label={t("profile.settingsPage.reportsSection")} className="grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1">
        {(["month", "year"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => setMode(value)}
            className={`min-h-10 rounded-lg text-sm font-medium transition-colors ${mode === value ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted"}`}
          >
            {t(`profile.account.${value}`)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {mode === "month" && (
          <select value={safeMonth} onChange={(e) => setMonth(Number(e.target.value))} aria-label={t("profile.account.monthAriaLabel")} className={input}>
            {MONTH_KEYS.slice(0, lastMonth).map((key, i) => (
              <option key={key} value={i + 1}>{t(`profile.account.months.${key}`)}</option>
            ))}
          </select>
        )}
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label={t("profile.account.yearAriaLabel")} className={`${input} ${mode === "year" ? "col-span-2" : ""}`}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <button type="button" disabled={pending} onClick={downloadPdf} className={`${primary} w-full`}>
        {pending ? t("profile.account.preparing") : t("profile.account.downloadPdf")}
      </button>
      <Notice feedback={feedback} />
    </div>
  );
}
