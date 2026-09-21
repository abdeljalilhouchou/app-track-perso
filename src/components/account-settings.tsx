"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/avatar";
import { changePassword, exportMyData, saveAvatarUrl, updateDisplayName } from "@/lib/actions/account";
import { getReport } from "@/lib/actions/report";
import { downloadReportPdf } from "@/lib/report-pdf";

const AVATAR_SIZE = 256;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

const input =
  "w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:border-accent";
const primary =
  "rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-on-accent transition hover:opacity-90 disabled:opacity-50";
const outline =
  "rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground-muted transition hover:bg-surface-muted disabled:opacity-50";

type Feedback = { kind: "ok" | "error"; text: string } | null;

function Notice({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p className="mt-2 text-xs" style={{ color: feedback.kind === "ok" ? "var(--success)" : "var(--danger)" }}>
      {feedback.text}
    </p>
  );
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

function AvatarSection({ userId, name, avatarUrl }: { userId: string; name: string; avatarUrl: string | null }) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState(avatarUrl);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onPick(file: File | undefined) {
    if (!file) return;
    setFeedback(null);
    if (!file.type.startsWith("image/")) return setFeedback({ kind: "error", text: "Choisis un fichier image." });
    if (file.size > MAX_FILE_BYTES) return setFeedback({ kind: "error", text: "Image trop lourde (8 Mo maximum)." });

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
        setFeedback({ kind: "ok", text: "Photo mise à jour." });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Erreur inconnue";
        setFeedback({
          kind: "error",
          text: `Impossible d'envoyer la photo : ${message}. Vérifie que la migration 0015 a été exécutée dans Supabase.`,
        });
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
      setFeedback({ kind: "ok", text: "Photo supprimée." });
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={name} url={url} size="xl" />
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => fileRef.current?.click()} className={primary}>
              {pending ? "Envoi..." : url ? "Changer la photo" : "Ajouter une photo"}
            </button>
            {url && (
              <button type="button" disabled={pending} onClick={remove} className={outline}>
                Supprimer
              </button>
            )}
          </div>
          <p className="text-xs text-foreground-muted">JPG, PNG ou WebP · recadrée en carré automatiquement.</p>
        </div>
      </div>
      <Notice feedback={feedback} />
    </div>
  );
}

function NameSection({ initialName }: { initialName: string }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [feedback, setFeedback] = useState<Feedback>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setFeedback(null);
        startTransition(async () => {
          const result = await updateDisplayName(name);
          setFeedback(result.error ? { kind: "error", text: result.error } : { kind: "ok", text: "Nom mis à jour." });
        });
      }}
    >
      <label className="mb-1 block text-xs font-medium text-foreground-muted">Nom affiché</label>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required className={input} />
        <button type="submit" disabled={pending || name.trim() === initialName} className={primary}>
          Enregistrer
        </button>
      </div>
      <Notice feedback={feedback} />
    </form>
  );
}

function PasswordSection() {
  const [pending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);

  return (
    <form
      key={formKey}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const current = String(data.get("current"));
        const next = String(data.get("next"));
        const confirm = String(data.get("confirm"));
        if (next !== confirm) return setFeedback({ kind: "error", text: "Les deux nouveaux mots de passe sont différents." });

        setFeedback(null);
        startTransition(async () => {
          const result = await changePassword(current, next);
          if (result.error) return setFeedback({ kind: "error", text: result.error });
          setFormKey((k) => k + 1);
          setFeedback({ kind: "ok", text: "Mot de passe modifié." });
        });
      }}
      className="space-y-2"
    >
      <input name="current" type="password" required autoComplete="current-password" placeholder="Mot de passe actuel" className={input} />
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="next" type="password" required minLength={6} autoComplete="new-password" placeholder="Nouveau mot de passe" className={input} />
        <input name="confirm" type="password" required minLength={6} autoComplete="new-password" placeholder="Confirmer" className={input} />
      </div>
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Modification..." : "Changer le mot de passe"}
      </button>
      <Notice feedback={feedback} />
    </form>
  );
}

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function ExportSection({ sinceYear }: { sinceYear: number }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
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
        const { data, error } = await getReport(
          mode === "month" ? { kind: "month", year, month: safeMonth } : { kind: "year", year }
        );
        if (error || !data) return setFeedback({ kind: "error", text: error ?? "Rapport indisponible." });
        await downloadReportPdf(data);
        setFeedback({ kind: "ok", text: `PDF « ${data.periodLabel} » téléchargé.` });
      } catch (e) {
        setFeedback({ kind: "error", text: e instanceof Error ? e.message : "Impossible de créer le PDF." });
      }
    });
  }

  function downloadJson() {
    setFeedback(null);
    startTransition(async () => {
      const { json, error } = await exportMyData();
      if (error || !json) return setFeedback({ kind: "error", text: error ?? "Export impossible." });

      const blob = new Blob([json], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `track-perso-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      setFeedback({ kind: "ok", text: "Export complet téléchargé." });
    });
  }

  const tab = (active: boolean) => ({
    background: active ? "var(--accent)" : "transparent",
    color: active ? "var(--on-accent)" : "var(--foreground-muted)",
  });

  return (
    <div className="space-y-4">
      <p className="text-xs text-foreground-muted">
        Télécharge un bilan PDF de tes habitudes, sport (musculation incluse), humeur, nutrition et poids, pour un mois ou
        pour toute une année.
      </p>

      <div className="inline-flex gap-1 rounded-xl border border-accent/40 bg-surface-muted p-1">
        <button
          type="button"
          onClick={() => setMode("month")}
          className="rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors"
          style={tab(mode === "month")}
        >
          Un mois
        </button>
        <button
          type="button"
          onClick={() => setMode("year")}
          className="rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors"
          style={tab(mode === "year")}
        >
          Toute l&apos;année
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {mode === "month" && (
          <select
            value={safeMonth}
            onChange={(e) => setMonth(Number(e.target.value))}
            aria-label="Mois"
            className={`${input} w-auto min-w-36`}
          >
            {MONTH_NAMES.slice(0, lastMonth).map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        )}
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label="Année"
          className={`${input} w-auto min-w-28`}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button type="button" disabled={pending} onClick={downloadPdf} className={primary}>
          {pending ? "Préparation..." : "📄 Télécharger le PDF"}
        </button>
      </div>

      <div className="border-t border-accent/20 pt-3">
        <p className="mb-2 text-xs text-foreground-muted">
          Besoin de toutes tes données brutes (sauvegarde) ? Export complet au format JSON :
        </p>
        <button type="button" disabled={pending} onClick={downloadJson} className={outline}>
          ⬇️ Export complet (JSON)
        </button>
      </div>
      <Notice feedback={feedback} />
    </div>
  );
}

export function AccountSettings({
  userId,
  email,
  displayName,
  avatarUrl,
  memberSinceYear,
}: {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  memberSinceYear: number;
}) {
  return (
    <div className="rounded-2xl border-[1.5px] border-accent/40 bg-surface p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-medium">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft">👤</span>
        Mon compte
      </h2>

      <div className="space-y-6">
        <AvatarSection userId={userId} name={displayName} avatarUrl={avatarUrl} />

        <div className="space-y-4 border-t border-accent/20 pt-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-muted">Adresse e-mail</label>
            <input value={email} readOnly disabled className={`${input} opacity-70`} />
          </div>
          <NameSection initialName={displayName} />
        </div>

        <div className="border-t border-accent/20 pt-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Mot de passe</h3>
          <PasswordSection />
        </div>

        <div className="border-t border-accent/20 pt-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Mes données</h3>
          <ExportSection sinceYear={memberSinceYear} />
        </div>
      </div>
    </div>
  );
}
