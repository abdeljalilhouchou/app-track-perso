"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { useActionToast } from "@/components/toast/use-action-toast";
import { Dialog } from "@/components/ui/dialog";
import { MUSCLE_GROUPS, muscleColor, muscleGroupI18nPath } from "@/lib/strength";
import { filterExercises } from "@/lib/exercises/search";
import { resolveExerciseAnatomy } from "@/lib/anatomy/identity";
import { EXERCISE_CATEGORIES, categoryOf, categoryOfMuscle, exerciseInitials, groupByCategory, type ExerciseCategoryId } from "@/lib/exercises/categories";
import { createExercise, deleteExercise, updateExercise } from "@/lib/actions/strength";
import { formatLocalizedDate } from "@/lib/format-date";
import type { LibraryExercise } from "@/lib/exercises/types";
import { SportMedia } from "../ui/sport-media";
import { SportIcon } from "../ui/sport-icons";
import { SportEmptyState, SportLink } from "../ui/sport-primitives";

type Origin = "all" | "builtin" | "mine";
type Sheet = { mode: "create" } | { mode: "edit"; exercise: LibraryExercise } | null;
const PAGE = 24;
const tint = (color: string) => ({ background: `linear-gradient(135deg, color-mix(in srgb, ${color} 24%, var(--surface)) 0%, color-mix(in srgb, ${color} 9%, var(--surface)) 100%)` });
const tag = (color: string) => ({ background: `color-mix(in srgb, ${color} 26%, transparent)`, color: `color-mix(in srgb, ${color} 60%, var(--foreground))` });

export function ExerciseLibrary({ exercises, calisthenicsReady, initialDiscipline = "all" }: { exercises: LibraryExercise[]; calisthenicsReady: boolean; initialDiscipline?: string }) {
  const { t, language } = useLanguage();
  const l = (key: string, vars?: Record<string, string | number>) => t(`sport.library.${key}`, vars);
  const v = (key: string, vars?: Record<string, string | number>) => t(`sport.library.v2.${key}`, vars);
  const muscleLabel = (group: string) => { const path = muscleGroupI18nPath(group); return path ? t(path) : group; };
  const n = new Intl.NumberFormat(language);
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState<Origin>("all");
  const [category, setCategory] = useState<ExerciseCategoryId | "all">("all");
  const [discipline, setDiscipline] = useState(initialDiscipline);
  const [muscle, setMuscle] = useState("all");
  const [equipment, setEquipment] = useState("all");
  const [level, setLevel] = useState("all");
  const [sort, setSort] = useState("asc");
  const [limit, setLimit] = useState(PAGE);
  const [sheet, setSheet] = useState<Sheet>(null);

  const muscles = [...new Set(exercises.flatMap((item) => [...item.primary, ...item.secondary]))].filter(Boolean);
  const materials = [...new Set(exercises.flatMap((item) => item.equipment))];
  const mine = exercises.filter((item) => item.origin === "personal");
  const filtered = useMemo(() => filterExercises(exercises, { search, discipline, muscle, equipment, level, sort }, language), [exercises, search, discipline, muscle, equipment, level, sort, language]);
  const scoped = filtered.filter((item) => (origin === "all" || (origin === "mine" ? item.origin === "personal" : item.origin !== "personal")) && (category === "all" || categoryOf(item).id === category));
  const activeFilters = [discipline !== "all", muscle !== "all", equipment !== "all", level !== "all"].filter(Boolean).length;
  const browsing = origin === "all" && !search && category === "all" && activeFilters === 0;
  // While browsing everything, the user's own exercises open the page on their own.
  // Families in a fixed order; inside one, the chosen name order (a stable sort keeps it).
  const familyIndex = (item: LibraryExercise) => EXERCISE_CATEGORIES.findIndex((family) => family.id === categoryOf(item).id);
  const listed = (browsing ? scoped.filter((item) => item.origin !== "personal") : scoped).toSorted((a, b) => familyIndex(a) - familyIndex(b));
  const shown = listed.slice(0, limit);
  const groups = groupByCategory(shown);
  const reset = () => { setSearch(""); setDiscipline("all"); setMuscle("all"); setEquipment("all"); setLevel("all"); setSort("asc"); setCategory("all"); setLimit(PAGE); };
  const more = () => setLimit((current) => current + PAGE);

  return <div className="mx-auto max-w-2xl space-y-4" data-exercise-library>
    <header className="flex items-center gap-3" data-strength-header>
      <Link href="/sport" prefetch={false} aria-label={t("sport.focus.backToSport")} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-surface transition hover:bg-surface-muted"><SportIcon name="chevron" className="sport-context-back-icon h-4 w-4" /></Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold" style={{ color: "color-mix(in srgb, var(--sport) 62%, var(--foreground))" }}>{v("headerCount", { count: n.format(exercises.length), mine: n.format(mine.length) })}</p>
        <h1 className="truncate text-[26px] font-bold leading-tight tracking-tight">{l("library")}</h1>
      </div>
      <button type="button" onClick={() => setSheet({ mode: "create" })} className="h-11 shrink-0 rounded-2xl px-3.5 text-sm font-extrabold text-[#062016]" style={{ background: "var(--sport)" }} data-exercise-create>{v("create")}</button>
    </header>

    <label className="relative block">
      <span className="sr-only">{l("search")}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="pointer-events-none absolute start-3.5 top-[15px] text-foreground-muted"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
      <input type="search" value={search} maxLength={160} placeholder={l("searchPlaceholder")} onChange={(event) => { setSearch(event.target.value); setLimit(PAGE); }} className="h-12 w-full rounded-2xl border border-border bg-surface pe-3.5 ps-10 text-[15px] outline-none focus:border-sport" />
    </label>

    <div role="group" aria-label={v("originAll")} className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-surface p-1" data-exercise-origin>
      {([["all", v("originAll"), exercises.length], ["builtin", v("originBuiltin"), exercises.length - mine.length], ["mine", v("originMine"), mine.length]] as const).map(([id, label, count]) => {
        const active = origin === id;
        return <button key={id} type="button" aria-pressed={active} onClick={() => { setOrigin(id); setLimit(PAGE); }} className="flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl px-1 text-[13px] font-semibold transition" style={active ? (id === "mine" ? { background: "var(--accent)", color: "#0b0b10" } : { background: "var(--foreground)", color: "var(--background)" }) : { color: "var(--foreground-muted)" }}>
          <span className="truncate">{label}</span><span className="text-[11px] tabular-nums opacity-70">{n.format(count)}</span>
        </button>;
      })}
    </div>

    <div className="relative">
      <div className="flex items-center gap-1.5">
        <details className="exercise-filters group shrink-0">
          <summary className="flex h-11 cursor-pointer list-none items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[13px] font-semibold [&::-webkit-details-marker]:hidden">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            {v("filters")}{activeFilters > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-[#062016]" style={{ background: "var(--sport)" }}>{activeFilters}</span>}
          </summary>
          <div className="absolute inset-x-0 top-[calc(100%+8px)] z-30 grid gap-3 rounded-3xl border border-border bg-surface p-4 shadow-2xl sm:grid-cols-2">
            <label className="exercise-field"><span>{l("discipline")}</span><select value={discipline} onChange={(event) => { setDiscipline(event.target.value); setLimit(PAGE); }}><option value="all">{l("all")}</option><option value="musculation">{t("sport.hub.nav.strength")}</option><option value="calisthenics" disabled={!calisthenicsReady}>{t("sport.hub.nav.calisthenics")}</option><option value="running">{t("sport.hub.nav.running")}</option></select></label>
            <label className="exercise-field"><span>{l("muscle")}</span><select value={muscle} onChange={(event) => { setMuscle(event.target.value); setLimit(PAGE); }}><option value="all">{l("all")}</option>{muscles.map((item) => <option key={item} value={item}>{muscleLabel(item)}</option>)}</select></label>
            <label className="exercise-field"><span>{l("equipment")}</span><select value={equipment} onChange={(event) => { setEquipment(event.target.value); setLimit(PAGE); }}><option value="all">{l("all")}</option>{materials.map((item) => <option key={item} value={item}>{l(`materials.${item}`)}</option>)}<option value="unknown">{l("unknown")}</option></select></label>
            <label className="exercise-field"><span>{l("level")}</span><select value={level} onChange={(event) => { setLevel(event.target.value); setLimit(PAGE); }}><option value="all">{l("all")}</option>{["beginner", "intermediate", "advanced"].map((item) => <option key={item} value={item}>{l(`levels.${item}`)}</option>)}<option value="unknown">{l("unknown")}</option></select></label>
            <label className="exercise-field"><span>{l("sort")}</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="asc">{l("ascending")}</option><option value="desc">{l("descending")}</option></select></label>
            <button type="button" onClick={reset} className="min-h-11 self-end rounded-xl border border-border text-sm font-semibold">{l("reset")}</button>
          </div>
        </details>
        <div className="flex min-w-0 gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none]" data-exercise-categories>
          {EXERCISE_CATEGORIES.filter((item) => item.id !== "other").map((item) => {
            const active = category === item.id;
            return <button key={item.id} type="button" aria-pressed={active} onClick={() => { setCategory(active ? "all" : item.id); setLimit(PAGE); }} className="flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition" style={active ? { border: `1.5px solid ${item.color}`, background: `color-mix(in srgb, ${item.color} 16%, var(--surface))` } : { border: "1px solid var(--border)" }}>
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: item.color }} />{l(`categories.${item.id}`)}
            </button>;
          })}
        </div>
      </div>
    </div>

    {!calisthenicsReady && discipline === "calisthenics" && <p className="sport-description">{l("calUnavailable")}</p>}
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{t("sport.library.count", { count: scoped.length })}</p>

    {origin === "mine" && <div className="flex gap-3 rounded-[20px] border p-3.5 text-[13px] leading-relaxed text-foreground-muted" style={{ borderColor: "color-mix(in srgb, var(--accent) 35%, var(--border))", background: "color-mix(in srgb, var(--accent) 8%, var(--surface))" }}>
      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl font-extrabold" style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "color-mix(in srgb, var(--accent) 70%, var(--foreground))" }}>★</span>
      <p>{v("mineIntro")}</p>
    </div>}

    {browsing && mine.length > 0 && <section aria-labelledby="exercise-mine" className="space-y-2.5" data-exercise-mine>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="exercise-mine" className="flex items-center gap-2 text-[15px] font-bold"><span aria-hidden className="grid h-[18px] w-[18px] place-items-center rounded-md text-[11px]" style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "color-mix(in srgb, var(--accent) 70%, var(--foreground))" }}>★</span>{v("mineTitle")}</h2>
        <button type="button" onClick={() => setOrigin("mine")} className="min-h-10 text-[13px] font-semibold" style={{ color: "color-mix(in srgb, var(--accent) 70%, var(--foreground))" }}>{v("seeAll", { count: n.format(mine.length) })}</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {mine.slice(0, 4).map((item) => <PersonalCard key={item.key} item={item} compact onEdit={() => setSheet({ mode: "edit", exercise: item })} />)}
      </div>
    </section>}

    {origin === "mine" ? (
      <div className="space-y-2" data-exercise-results>
        {scoped.length ? scoped.slice(0, limit).map((item) => <PersonalCard key={item.key} item={item} onEdit={() => setSheet({ mode: "edit", exercise: item })} />) : <p className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-foreground-muted">{mine.length ? l("noResultsBody") : v("emptyMine")}</p>}
        <button type="button" onClick={() => setSheet({ mode: "create" })} className="min-h-[52px] w-full rounded-[18px] border-[1.5px] border-dashed text-sm font-bold" style={{ borderColor: "color-mix(in srgb, var(--accent) 50%, var(--border))", color: "color-mix(in srgb, var(--accent) 70%, var(--foreground))" }}>{v("createTitle")}</button>
      </div>
    ) : listed.length ? (
      <div className="space-y-5" data-exercise-results>
        {groups.map(({ category: family, items }) => <section key={family.id} aria-labelledby={`family-${family.id}`} className="space-y-2" data-exercise-family={family.id}>
          <div className="flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ background: family.color }} />
            <h2 id={`family-${family.id}`} className="text-[15px] font-bold">{l(`categories.${family.id}`)}</h2>
            <span className="text-xs text-foreground-muted">{n.format(listed.filter((item) => categoryOf(item).id === family.id).length)}</span>
            <span aria-hidden className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            {items.map((item) => item.origin === "personal"
              ? <PersonalCard key={item.key} item={item} onEdit={() => setSheet({ mode: "edit", exercise: item })} />
              : <LibraryCard key={item.key} item={item} />)}
          </div>
        </section>)}
      </div>
    ) : (
      <SportEmptyState icon="exercise" title={l("noResults")} description={discipline === "running" ? l("runningEmpty") : discipline === "calisthenics" && !calisthenicsReady ? l("calUnavailable") : l("noResultsBody")} action={discipline === "running" ? <SportLink href="/sport/running" variant="primary">{l("runningLink")}</SportLink> : <button type="button" onClick={reset} className="sport-button sport-button-secondary">{l("reset")}</button>} />
    )}

    {(origin === "mine" ? scoped.length : listed.length) > limit && <button type="button" onClick={more} className="min-h-12 w-full rounded-2xl border border-border text-sm font-semibold transition hover:bg-surface-muted">{l("showMore")}</button>}

    {sheet && <ExerciseSheet key={sheet.mode === "edit" ? sheet.exercise.key : "create"} sheet={sheet} onClose={() => setSheet(null)} />}
  </div>;
}

function useLibraryText() {
  const { t, language } = useLanguage();
  return {
    language,
    l: (key: string, vars?: Record<string, string | number>) => t(`sport.library.${key}`, vars),
    v: (key: string, vars?: Record<string, string | number>) => t(`sport.library.v2.${key}`, vars),
    muscleLabel: (group: string) => { const path = muscleGroupI18nPath(group); return path ? t(path) : group; },
  };
}

function LibraryCard({ item }: { item: LibraryExercise }) {
  const { l, v, muscleLabel } = useLibraryText();
  const family = categoryOf(item);
  const image = item.thumbnail ?? item.image;
  const anatomy = resolveExerciseAnatomy({ name: item.name, exerciseKey: item.key, origin: item.origin, discipline: item.discipline });
  const meta = [item.equipment.map((value) => l(`materials.${value}`)).join(" · "), item.level ? l(`levels.${item.level}`) : null].filter(Boolean).join(" · ");
  return <article className="overflow-hidden rounded-[20px] border" style={{ ...tint(family.color), borderColor: `color-mix(in srgb, ${family.color} 38%, var(--border))` }} data-exercise-card="builtin" data-family={family.id}>
    <Link href={`/sport/exercises/${encodeURIComponent(item.key)}`} prefetch={false} className="flex items-center gap-3 p-3">
      <span className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#f4f4f6]"><SportMedia image={image} ratio="square" sizes="64px" icon="exercise" decorative /></span>
      <span className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-bold">{item.name}</h3>
        {meta && <span className="mt-0.5 block truncate text-xs text-foreground-muted">{meta}</span>}
        <span className="mt-1.5 flex flex-wrap gap-1">
          {item.primary[0] && <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={tag(family.color)}>{muscleLabel(item.primary[0])}</span>}
          {item.guideId && <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground-muted">{v("guideBadge")}</span>}
          {anatomy && <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground-muted">{v("anatomyBadge")}</span>}
        </span>
      </span>
      <SportIcon name="chevron" className="sport-chevron h-3.5 w-3.5 shrink-0" />
    </Link>
  </article>;
}

function PersonalCard({ item, compact = false, onEdit }: { item: LibraryExercise; compact?: boolean; onEdit: () => void }) {
  const { v, language, muscleLabel } = useLibraryText();
  const family = categoryOf(item);
  const color = muscleColor(item.primary[0] ?? "");
  const badge = <span aria-hidden className={`grid shrink-0 place-items-center rounded-2xl font-extrabold text-white ${compact ? "h-10 w-10 text-sm" : "h-14 w-14 text-base"}`} style={{ background: `color-mix(in srgb, ${family.color} 60%, var(--surface))` }}>{exerciseInitials(item.name)}</span>;
  const added = item.createdAt ? v("addedOn", { date: formatLocalizedDate(item.createdAt.slice(0, 10), language, { day: "numeric", month: "short" }) }) : null;
  return <article className="relative overflow-hidden rounded-[20px] border-[1.5px] border-dashed" style={{ ...tint(family.color), borderColor: `color-mix(in srgb, ${family.color} 60%, transparent)` }} data-exercise-card="personal" data-family={family.id}>
    {compact ? (
      <Link href={`/sport/exercises/${encodeURIComponent(item.key)}`} prefetch={false} className="flex h-full flex-col gap-2.5 p-3">
        <span className="flex items-center justify-between gap-2">{badge}<span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={tag("var(--accent)")}>{v("createdByYou")}</span></span>
        <span className="min-w-0"><h3 className="truncate text-sm font-bold">{item.name}</h3><span className="mt-0.5 block text-xs font-semibold" style={{ color: `color-mix(in srgb, ${color} 70%, var(--foreground))` }}>{item.primary[0] ? muscleLabel(item.primary[0]) : ""}</span></span>
        {added && <span className="text-[11px] text-foreground-muted">{added}</span>}
      </Link>
    ) : (
      <div className="flex items-center gap-3 p-3">
        <Link href={`/sport/exercises/${encodeURIComponent(item.key)}`} prefetch={false} className="flex min-w-0 flex-1 items-center gap-3">
          {badge}
          <span className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-bold">{item.name}</h3>
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {item.primary[0] && <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={tag(family.color)}>{muscleLabel(item.primary[0])}</span>}
              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={tag("var(--accent)")}>{v("createdByYou")}</span>
              {added && <span className="text-[11px] text-foreground-muted">{added}</span>}
            </span>
          </span>
        </Link>
        <button type="button" onClick={onEdit} aria-label={v("options", { name: item.name })} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg text-foreground-muted transition hover:bg-surface-muted" data-exercise-edit>⋯</button>
      </div>
    )}
  </article>;
}

function ExerciseSheet({ sheet, onClose }: { sheet: NonNullable<Sheet>; onClose: () => void }) {
  const { t } = useLanguage();
  const v = (key: string, vars?: Record<string, string | number>) => t(`sport.library.v2.${key}`, vars);
  const muscleLabel = (group: string) => { const path = muscleGroupI18nPath(group); return path ? t(path) : group; };
  const router = useRouter();
  const run = useActionToast();
  const [pending, startTransition] = useTransition();
  const editing = sheet.mode === "edit" ? sheet.exercise : null;
  const [name, setName] = useState(editing?.name ?? "");
  const [muscle, setMuscle] = useState(editing?.primary[0] ?? "Pectoraux");
  const [error, setError] = useState<string | null>(null);
  const family = categoryOfMuscle(muscle);
  const valid = name.trim().length >= 2;

  function save() {
    setError(null);
    startTransition(async () => {
      const clean = name.trim();
      const result = await run(() => (editing?.databaseId ? updateExercise(editing.databaseId, clean, muscle) : createExercise(clean, muscle)), {
        success: v(editing ? "updatedToast" : "createdToast", { name: clean }),
        failure: v("failedToast"),
      });
      if (!result || result.error) return setError(result?.error ?? v("failedToast"));
      onClose();
      router.refresh();
    });
  }

  function remove() {
    if (!editing?.databaseId || !confirm(v("confirmDelete", { name: editing.name }))) return;
    const id = editing.databaseId;
    startTransition(async () => {
      const result = await run(() => deleteExercise(id), { success: v("deletedToast", { name: editing.name }), failure: v("failedToast") });
      if (!result || result.error) return setError(result?.error ?? v("failedToast"));
      onClose();
      router.refresh();
    });
  }

  return <Dialog open onClose={onClose} widthClassName="max-w-md" ariaLabel={v(editing ? "editTitle" : "createTitle")}>
    <div className="max-h-[88vh] space-y-4 overflow-y-auto rounded-3xl border border-border bg-surface p-5 shadow-2xl" data-exercise-sheet>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold">{v(editing ? "editTitle" : "createTitle")}</h2>
        <button type="button" onClick={onClose} aria-label={v("close")} className="grid h-10 w-10 place-items-center rounded-xl bg-surface-muted">✕</button>
      </div>
      <div className="flex items-center gap-3 rounded-[18px] border border-dashed p-3" style={{ ...tint(family.color), borderColor: `color-mix(in srgb, ${family.color} 60%, transparent)` }} aria-hidden>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-base font-extrabold text-white" style={{ background: `color-mix(in srgb, ${family.color} 60%, var(--surface))` }}>{exerciseInitials(name || "?")}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-bold">{name.trim() || v("namePlaceholder")}</span>
          <span className="mt-1 flex gap-1.5"><span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={tag(family.color)}>{muscleLabel(muscle)}</span><span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={tag("var(--accent)")}>{v("createdByYou")}</span></span>
        </span>
        <span className="text-[11px] text-foreground-muted">{v("preview")}</span>
      </div>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">{v("nameLabel")}
        <input value={name} maxLength={100} onChange={(event) => setName(event.target.value)} placeholder={v("namePlaceholder")} className="h-12 rounded-2xl border border-border bg-surface-muted px-3.5 text-[15px] font-medium outline-none focus:border-sport" data-exercise-name />
      </label>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-[13px] font-semibold">{v("mainMuscle")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {MUSCLE_GROUPS.map((group) => {
            const active = muscle === group;
            const color = categoryOfMuscle(group).color;
            return <button key={group} type="button" aria-pressed={active} onClick={() => setMuscle(group)} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold" style={active ? { border: `1.5px solid ${color}`, background: `color-mix(in srgb, ${color} 16%, var(--surface))` } : { border: "1px solid var(--border)" }}>
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color }} />{muscleLabel(group)}
            </button>;
          })}
        </div>
      </fieldset>
      {editing && <p className="text-xs text-foreground-muted">{v("renameNote")}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
      <button type="button" disabled={!valid || pending} onClick={save} className="min-h-[52px] w-full rounded-2xl text-base font-extrabold text-[#062016] disabled:opacity-50" style={{ background: "var(--sport)" }} data-exercise-save>{v(editing ? "saveButton" : "createButton")}</button>
      {editing && <button type="button" disabled={pending} onClick={remove} className="min-h-11 w-full rounded-2xl border border-border text-sm font-semibold text-danger" data-exercise-delete>{v("deleteButton")}</button>}
    </div>
  </Dialog>;
}
