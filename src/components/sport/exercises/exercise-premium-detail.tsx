"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { useLanguage } from "@/components/language-provider";
import { muscleGroupI18nPath } from "@/lib/strength";
import type { ExerciseDetail } from "@/lib/exercises/types";
import { SportBadge, SportCard } from "../ui/sport-primitives";
import { ExerciseMuscleButton } from "../anatomy/exercise-muscle-button";
import { ExercisePhotoGallery } from "./exercise-photo-gallery";
import { ExercisePerformance } from "./exercise-performance";

const tabs = ["demonstration", "technique", "muscles", "advice"] as const;
type Tab = typeof tabs[number];
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
    <p className="sport-description exercise-premium-variant">{media.variant[language]}</p>
    <div className="exercise-premium-tabs" role="tablist" aria-label={l("guide")}>{tabs.map((value, index) => <button key={value} id={`${id}-tab-${value}`} role="tab" type="button" aria-selected={tab === value} aria-controls={`${id}-panel-${value}`} tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={(event) => navigate(event, index)} data-premium-tab={value}>{l(value === "demonstration" ? "photos" : value === "advice" ? "mistakesAndTips" : value)}</button>)}</div>
    <div id={`${id}-panel-demonstration`} role="tabpanel" aria-labelledby={`${id}-tab-demonstration`} hidden={tab !== "demonstration"}>
      <ExercisePhotoGallery key={media.exerciseId} media={media} guideId={exercise.guideId} name={exercise.name} />
    </div>
    <div id={`${id}-panel-technique`} role="tabpanel" aria-labelledby={`${id}-tab-technique`} hidden={tab !== "technique"}>
      <SportCard className="exercise-premium-editorial">{text ? <><h3>{text.objective}</h3><p className="sport-description">{text.description}</p><ol className="exercise-steps">{(["preparation", "position", "execution", "return"] as const).map((key, index) => <li key={key}><span aria-hidden="true">{index + 1}</span><div><h4>{l(key)}</h4><p className="sport-description">{text[key]}</p></div></li>)}</ol><dl className="exercise-advice"><div><dt>{l("breathing")}</dt><dd>{text.breathing}</dd></div></dl></> : <p>{l("missingGuide")}</p>}</SportCard>
    </div>
    <div id={`${id}-panel-muscles`} role="tabpanel" aria-labelledby={`${id}-tab-muscles`} hidden={tab !== "muscles"}>
      <SportCard className="exercise-premium-editorial"><h3>{l("anatomy")}</h3><ExerciseMuscleButton name={exercise.name} exerciseKey={exercise.key} origin={exercise.origin} discipline={exercise.discipline} />
        <div className="exercise-premium-muscles">{(["primary", "secondary", "stabilizer"] as const).map((role) => {
          const names = anatomySummary?.[role] ?? (role === "primary" ? exercise.primary.map(muscleLabel) : role === "secondary" ? exercise.secondary.map(muscleLabel) : []);
          return <div key={role}><h4>{l(role === "stabilizer" ? "stabilizers" : role)}</h4>{names.length ? <ul>{names.map((name) => <li key={name}>{name}</li>)}</ul> : <p className="sport-description">{l("unknown")}</p>}</div>;
        })}</div>{anatomySummary?.limitations.map((note, index) => <p key={index} className="sport-description">{note}</p>)}
      </SportCard>
    </div>
    <div id={`${id}-panel-advice`} role="tabpanel" aria-labelledby={`${id}-tab-advice`} hidden={tab !== "advice"}>
      <div className="exercise-premium-advice-grid"><SportCard className="exercise-premium-editorial"><h3>{l("mistakes")}</h3>{text ? <ul className="exercise-prose-list">{text.mistakes.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{l("missingGuide")}</p>}</SportCard>
        <SportCard className="exercise-premium-editorial"><h3>{l("tips")}</h3>{text && <><ul className="exercise-prose-list">{text.tips.map((item) => <li key={item}>{item}</li>)}</ul><dl className="exercise-advice">{(["tempo", "range"] as const).map((key) => <div key={key}><dt>{l(key)}</dt><dd>{text[key]}</dd></div>)}</dl><div className="exercise-safety">{text.safety}</div></>}</SportCard></div>
    </div>
    <ExercisePerformance data={data} />
    {!!data.sources.length && <details className="exercise-premium-sources"><summary>{l("sources")}</summary><p className="sport-description">{l("sourceNote")}</p>{data.sources.map((source) => <a className="exercise-source-link" key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>)}</details>}
  </div>;
}
