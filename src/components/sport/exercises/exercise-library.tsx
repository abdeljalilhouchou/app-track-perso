"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { muscleGroupI18nPath } from "@/lib/strength";
import { filterExercises } from "@/lib/exercises/search";
import { anatomyCoverage } from "@/lib/anatomy/identity";
import { exerciseCatalogComposition } from "@/lib/exercises/composition";
import type { LibraryExercise } from "@/lib/exercises/types";
import { ExerciseCard } from "../ui/sport-content-cards";
import { SportBadge, SportButton, SportCard, SportEmptyState, SportLink } from "../ui/sport-primitives";
import { MovementSketch } from "./movement-sketch";
import { ExerciseMuscleButton } from "../anatomy/exercise-muscle-button";

export function ExerciseLibrary({ exercises, calisthenicsReady, initialDiscipline = "all" }: { exercises: LibraryExercise[]; calisthenicsReady: boolean; initialDiscipline?: string }) {
  const { t, language } = useLanguage();
  const l = (key: string) => t(`sport.library.${key}`);
  const [search, setSearch] = useState("");
  const [discipline, setDiscipline] = useState(initialDiscipline);
  const [muscle, setMuscle] = useState("all");
  const [equipment, setEquipment] = useState("all");
  const [level, setLevel] = useState("all");
  const [sort, setSort] = useState("asc");
  const [limit, setLimit] = useState(24);
  const muscleLabel = (group: string) => { const path = muscleGroupI18nPath(group); return path ? t(path) : group; };
  const muscles = [...new Set(exercises.flatMap((item) => [...item.primary, ...item.secondary]))].filter(Boolean);
  const materials = [...new Set(exercises.flatMap((item) => item.equipment))];
  const filtered = useMemo(() => filterExercises(exercises, { search, discipline, muscle, equipment, level, sort }, language), [exercises, search, discipline, muscle, equipment, level, sort, language]);
  const anatomy = useMemo(() => anatomyCoverage(exercises), [exercises]);
  const composition = useMemo(() => exerciseCatalogComposition(exercises), [exercises]);
  function reset() { setSearch(""); setDiscipline("all"); setMuscle("all"); setEquipment("all"); setLevel("all"); setSort("asc"); setLimit(24); }
  return <div className="space-y-5" data-exercise-library>
    <SportCard><p className="sport-description mb-4">{l("intro")}</p>
      <div className="exercise-search-row">
        <label className="exercise-field flex-1"><span>{l("search")}</span><input type="search" value={search} maxLength={160} placeholder={l("searchPlaceholder")} onChange={(event) => { setSearch(event.target.value); setLimit(24); }} /></label>
        <label className="exercise-field"><span>{l("discipline")}</span><select value={discipline} onChange={(event) => { setDiscipline(event.target.value); setLimit(24); }}><option value="all">{l("all")}</option><option value="musculation">{t("sport.hub.nav.strength")}</option><option value="calisthenics" disabled={!calisthenicsReady}>{t("sport.hub.nav.calisthenics")}</option><option value="running">{t("sport.hub.nav.running")}</option></select></label>
      </div>
      <details className="exercise-filters mt-3"><summary className="sport-button sport-button-secondary">{l("muscle")} · {l("equipment")} · {l("level")}</summary><div className="exercise-filter-grid mt-4">
        <label className="exercise-field"><span>{l("muscle")}</span><select value={muscle} onChange={(event) => { setMuscle(event.target.value); setLimit(24); }}><option value="all">{l("all")}</option>{muscles.map((item) => <option key={item} value={item}>{muscleLabel(item)}</option>)}</select></label>
        <label className="exercise-field"><span>{l("equipment")}</span><select value={equipment} onChange={(event) => { setEquipment(event.target.value); setLimit(24); }}><option value="all">{l("all")}</option>{materials.map((item) => <option key={item} value={item}>{l(`materials.${item}`)}</option>)}<option value="unknown">{l("unknown")}</option></select></label>
        <label className="exercise-field"><span>{l("level")}</span><select value={level} onChange={(event) => { setLevel(event.target.value); setLimit(24); }}><option value="all">{l("all")}</option>{["beginner", "intermediate", "advanced"].map((item) => <option key={item} value={item}>{l(`levels.${item}`)}</option>)}<option value="unknown">{l("unknown")}</option></select></label>
      </div></details>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3"><label className="exercise-field"><span>{l("sort")}</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="asc">{l("ascending")}</option><option value="desc">{l("descending")}</option></select></label><SportButton variant="ghost" onClick={reset}>{l("reset")}</SportButton></div>
    </SportCard>
    {!calisthenicsReady && <p className="sport-description">{l("calUnavailable")}</p>}
    <p className="sport-description" data-anatomy-coverage>{t("sport.library.anatomyCoverage", anatomy)}</p>
    <details className="exercise-catalog-composition"><summary>{l("catalogComposition")}</summary><p className="sport-description mt-2" data-catalog-composition>{t("sport.library.catalogCompositionBody", composition)}</p><p className="sport-description mt-2" data-photo-coverage>{t("sport.library.photoCoverage", composition)}</p></details>
    <div className="flex flex-wrap items-center justify-between gap-3"><p role="status" aria-live="polite" aria-atomic="true" className="text-sm font-semibold">{t("sport.library.count", { count: filtered.length })}</p><SportBadge>{l("documented")}: {filtered.filter((item) => item.guideId).length}</SportBadge></div>
    {filtered.length ? <div className="grid gap-3 lg:grid-cols-2" data-exercise-results>{filtered.slice(0, limit).map((item) => <ExerciseCard key={item.key} title={item.name} href={`/sport/exercises/${encodeURIComponent(item.key)}`} prefetch={false} image={item.thumbnail ?? item.image} fallback={<MovementSketch id={item.guideId} />}
      muscleGroups={item.primary.map(muscleLabel)} equipment={`${item.equipment.length ? item.equipment.map((value) => l(`materials.${value}`)).join(" · ") : l("unknown")}${item.level ? ` · ${l(`levels.${item.level}`)}` : ""}`}
      detail={item.origin === "personal" ? l("personal") : item.guideId ? l("documented") : l("basic")}
      action={<ExerciseMuscleButton name={item.name} exerciseKey={item.key} origin={item.origin} discipline={item.discipline} />} />)}</div>
      : <SportEmptyState icon="exercise" title={l("noResults")} description={discipline === "running" ? l("runningEmpty") : discipline === "calisthenics" && !calisthenicsReady ? l("calUnavailable") : l("noResultsBody")} action={discipline === "running" ? <SportLink href="/sport/running">{l("runningLink")}</SportLink> : <SportButton onClick={reset}>{l("reset")}</SportButton>} />}
    {filtered.length > limit && <SportButton variant="secondary" onClick={() => setLimit((current) => current + 24)}>{t("sport.library.showMore")}</SportButton>}
  </div>;
}
