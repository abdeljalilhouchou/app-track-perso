"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { useLanguage } from "@/components/language-provider";
import { muscleGroupI18nPath } from "@/lib/strength";
import type { ExerciseDetail } from "@/lib/exercises/types";
import { SportBadge, SportCard } from "../ui/sport-primitives";
import { ExerciseMuscleButton } from "../anatomy/exercise-muscle-button";
import { ExercisePhotoGallery } from "./exercise-photo-gallery";
import { ExercisePerformance } from "./exercise-performance";
import { SportIcon, type SportIconName } from "../ui/sport-icons";

const tabs = ["demonstration", "technique", "muscles", "advice"] as const;
type Tab = typeof tabs[number];
const tabIcons: Record<Tab, SportIconName> = { demonstration: "image", technique: "program", muscles: "anatomy", advice: "alert" };
export function ExercisePremiumDetail({ data }: { data: ExerciseDetail }) {
  const { t, language, dir } = useLanguage();
  const id = useId();
  const [tab, setTab] = useState<Tab>("demonstration");
  const { exercise, media, text, anatomySummary } = data;
  const l = (key: string) => t(`sport.library.${key}`);
  if (!media) return null;
  const muscleLabel = (group: string) => { const path = muscleGroupI18nPath(group); return path ? t(path) : group; };
  function navigate(event: KeyboardEvent<HTMLButtonElement>, current: number) {
    const direction = dir === "rtl" ? -1 : 1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : event.key === "ArrowRight" ? (current + direction + tabs.length) % tabs.length : event.key === "ArrowLeft" ? (current - direction + tabs.length) % tabs.length : -1;
    if (next < 0) return;
    event.preventDefault(); setTab(tabs[next]); document.getElementById(`${id}-tab-${tabs[next]}`)?.focus({ preventScroll: true });
  }
  return <div className="exercise-detail exercise-premium-detail" data-exercise-detail data-premium-exercise={exercise.key}>
    <div className="exercise-premium-meta">{exercise.primary.map((group) => <SportBadge key={group} tone="sport">{muscleLabel(group)}</SportBadge>)}{media.illustratedEquipment.map((item) => <SportBadge key={item}>{l(`materials.${item}`)}</SportBadge>)}{exercise.level && <SportBadge>{l(`levels.${exercise.level}`)}</SportBadge>}</div>
    <div className="exercise-premium-tabs" role="tablist" aria-label={l("guide")}>{tabs.map((value, index) => <button key={value} id={`${id}-tab-${value}`} role="tab" type="button" aria-selected={tab === value} aria-controls={`${id}-panel-${value}`} tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={(event) => navigate(event, index)} data-premium-tab={value}><SportIcon name={tabIcons[value]} className="h-5 w-5" /><span>{l(value === "demonstration" ? "photos" : value === "advice" ? "mistakesAndTips" : value)}</span></button>)}</div>
    <div id={`${id}-panel-demonstration`} role="tabpanel" tabIndex={0} aria-labelledby={`${id}-tab-demonstration`} hidden={tab !== "demonstration"}>
      <ExercisePhotoGallery key={media.exerciseId} media={media} guideId={exercise.guideId} name={exercise.name} />
      <p className="sport-description exercise-premium-variant">{media.variant[language]}</p>
    </div>
    <div id={`${id}-panel-technique`} role="tabpanel" tabIndex={0} aria-labelledby={`${id}-tab-technique`} hidden={tab !== "technique"}>
      <SportCard className="exercise-premium-editorial">{text ? <><h3><SportIcon name="program" />{l("technique")}</h3><p className="sport-description">{text.description}</p><ol className="exercise-steps">{(["preparation", "position", "execution", "return"] as const).map((key, index) => <li key={key}><span aria-hidden="true">{(index + 1).toLocaleString(language)}</span><div><h4>{l(key)}</h4><p className="sport-description">{text[key]}</p></div></li>)}</ol><dl className="exercise-advice exercise-technique-cues">{(["breathing", "range", "tempo"] as const).map((key) => <div key={key}><dt>{l(key)}</dt><dd>{text[key]}</dd></div>)}</dl></> : <p>{l("missingGuide")}</p>}</SportCard>
    </div>
    <div id={`${id}-panel-muscles`} role="tabpanel" tabIndex={0} aria-labelledby={`${id}-tab-muscles`} hidden={tab !== "muscles"}>
      <SportCard className="exercise-premium-editorial"><h3><SportIcon name="anatomy" />{l("anatomy")}</h3>
        <div className="exercise-premium-muscles">{(["primary", "secondary", "stabilizer"] as const).map((role) => {
          const names = anatomySummary?.[role] ?? (role === "primary" ? exercise.primary.map(muscleLabel) : role === "secondary" ? exercise.secondary.map(muscleLabel) : []);
          return <div key={role} data-muscle-role={role}><h4>{l(role === "stabilizer" ? "stabilizers" : role)}</h4>{names.length ? <ul>{names.map((name) => { const action = anatomySummary?.details?.find((item) => item.name === name && item.role === role)?.action; return <li key={name}><strong>{name}</strong>{action && <p>{action}</p>}</li>; })}</ul> : <p className="sport-description">{l("unknown")}</p>}</div>;
        })}</div>{anatomySummary?.limitations.map((note, index) => <p key={index} className="sport-description">{note}</p>)}
      </SportCard>
    </div>
    <div id={`${id}-panel-advice`} role="tabpanel" tabIndex={0} aria-labelledby={`${id}-tab-advice`} hidden={tab !== "advice"}>
      <div className="exercise-premium-advice-grid">{(["mistakes", "tips"] as const).map((kind) => <SportCard className="exercise-premium-editorial" key={kind}><h3><SportIcon name={kind === "mistakes" ? "alert" : "check"} />{l(kind)}</h3>{text ? <ul className="exercise-prose-list exercise-correction-list">{text[kind].map((item, index) => {
        const colon = item.indexOf(":");
        const titled = colon > 0 && colon < 90;
        return <li key={item}><span className="exercise-advice-icon"><SportIcon name={kind === "mistakes" ? "alert" : "check"} className="h-4 w-4" /></span><div><h4>{titled ? item.slice(0, colon).trim() : t(`sport.library.${kind === "mistakes" ? "mistakeNumber" : "tipNumber"}`, { number: (index + 1).toLocaleString(language) })}</h4><p>{titled ? item.slice(colon + 1).trim() : item}</p></div></li>;
      })}</ul> : <p>{l("missingGuide")}</p>}</SportCard>)}</div>{text && <div className="exercise-safety"><SportIcon name="info" /><p>{text.safety}</p></div>}
    </div>
    <div className="exercise-premium-3d"><ExerciseMuscleButton name={exercise.name} exerciseKey={exercise.key} origin={exercise.origin} discipline={exercise.discipline} label={l("viewMuscles3D")} /></div>
    <ExercisePerformance data={data} />
    {!!data.sources.length && <details className="exercise-premium-sources"><summary>{l("sources")}</summary><p className="sport-description">{l("sourceNote")}</p>{data.sources.map((source) => <a className="exercise-source-link" key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>)}</details>}
  </div>;
}
