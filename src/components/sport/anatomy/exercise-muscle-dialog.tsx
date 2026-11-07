"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import { useLanguage } from "@/components/language-provider";
import { getExerciseAnatomy } from "@/lib/anatomy/configs";
import { generalAnatomyCopy } from "@/lib/anatomy/general-copy";
import { muscleGroupI18nPath } from "@/lib/strength";
import { anatomyCopy } from "@/lib/anatomy/copy";
import type { WorkingSide } from "@/lib/anatomy/rowing";
import type { MuscleGroupId } from "@/lib/anatomy/types";
import { SportButton, SportCard } from "../ui/sport-primitives";
import { SportIcon } from "../ui/sport-icons";
import { MuscleInformationPanel, MuscleLegend, MuscleList } from "./muscle-information-panel";

const MuscleViewer3D = dynamic(() => import("./muscle-viewer-3d"), { ssr: false });
const tabs = ["muscles", "technique", "mistakes", "tips"] as const;
type Tab = (typeof tabs)[number];
export default function ExerciseMuscleDialog({ anatomyId, onClose }: { anatomyId: string; onClose: () => void }) {
  const { language, dir, t } = useLanguage();
  const config = getExerciseAnatomy(anatomyId);
  // Only IDs from the lightweight registry can open this component.
  if (!config) return null;
  return <ConfiguredMuscleDialog key={config.id} config={config} onClose={onClose} language={language} dir={dir} t={t} />;
}
function ConfiguredMuscleDialog({ config, onClose, language, dir, t }: { config: NonNullable<ReturnType<typeof getExerciseAnatomy>>; onClose: () => void } & Pick<ReturnType<typeof useLanguage>, "language" | "dir" | "t">) {
  const { ui } = anatomyCopy(language);
  const general = generalAnatomyCopy(language);
  const text = config.technique?.[language];
  const visibleTabs = text ? tabs : tabs.slice(0, 1);
  const categoryKey = muscleGroupI18nPath(config.category);
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("muscles");
  const [side, setSide] = useState<WorkingSide>("right");
  const [selected, setSelected] = useState<MuscleGroupId | null>(config.muscles.find((group) => group.role === "primary")?.id ?? null);
  const [colors, setColors] = useState(true);
  const [xray, setXray] = useState(false);
  useEffect(() => {
    const panel = dialog.current;
    const previousOverflow = document.body.style.overflow;
    panel?.showModal(); document.body.style.overflow = "hidden";
    return () => { panel?.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  function chooseTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const direction = dir === "rtl" ? -1 : 1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? visibleTabs.length - 1 : event.key === "ArrowRight" ? (index + direction + visibleTabs.length) % visibleTabs.length : event.key === "ArrowLeft" ? (index - direction + visibleTabs.length) % visibleTabs.length : -1;
    if (next < 0) return;
    event.preventDefault(); setTab(visibleTabs[next]); document.getElementById(`${id}-tab-${visibleTabs[next]}`)?.focus();
  }
  return <dialog ref={dialog} dir={dir} className={`sport-ui anatomy-dialog${expanded ? " is-expanded" : ""}`} aria-labelledby={`${id}-title`} onCancel={(event) => { event.stopPropagation(); onClose(); }} onClose={(event) => { event.stopPropagation(); onClose(); }} onClick={(event) => {
    if (event.target !== dialog.current) return;
    const rect = dialog.current.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }} data-muscle-dialog data-anatomy-exercise={config.id}>
    <header className="anatomy-dialog-header"><div className="anatomy-header-icon"><SportIcon name="strength" /></div><div className="min-w-0 flex-1"><h2 id={`${id}-title`} className="break-words text-lg font-semibold">{config.names[language]}</h2><p className="anatomy-header-meta"><span>{categoryKey ? t(categoryKey) : config.category}</span><span>{config.equipment.length ? config.equipment.map((item) => t(`sport.library.materials.${item}`)).join(" · ") : general.unknownEquipment}</span></p><p className="anatomy-header-level">{config.level ? t(`sport.library.levels.${config.level}`) : general.unknownLevel}</p></div><div className="anatomy-header-actions"><SportButton variant="ghost" aria-label={expanded ? ui.collapse : ui.expand} aria-expanded={expanded} onClick={() => setExpanded((current) => !current)} data-anatomy-expand>{expanded ? "↙" : "↗"}</SportButton><SportButton variant="secondary" aria-label={ui.close} onClick={onClose} data-anatomy-close>×</SportButton></div></header>
    <div className="anatomy-dialog-body">
      <div className="anatomy-tabs" role="tablist" aria-label={config.names[language]}>{visibleTabs.map((item, index) => <button key={item} id={`${id}-tab-${item}`} type="button" role="tab" aria-selected={tab === item} aria-controls={`${id}-panel-${item}`} tabIndex={tab === item ? 0 : -1} onClick={() => setTab(item)} onKeyDown={(event) => chooseTab(event, index)} data-anatomy-tab={item}>{ui[item]}</button>)}</div>
      <div id={`${id}-panel-muscles`} role="tabpanel" aria-labelledby={`${id}-tab-muscles`} hidden={tab !== "muscles"}>
        {config.unilateral && <div className="anatomy-side-controls" role="group" aria-label={ui.side}><span>{ui.side}</span>{(["left", "right"] as const).map((value) => <SportButton key={value} variant="secondary" aria-pressed={side === value} onClick={() => setSide(value)} data-anatomy-side={value}>{ui[value]}</SportButton>)}</div>}
        <div className="anatomy-content-grid"><div className="min-w-0"><MuscleViewer3D config={config} side={side} selected={selected} onSelect={setSelected} colors={colors} xray={xray}><MuscleLegend /></MuscleViewer3D><div className="anatomy-options"><label><input type="checkbox" checked={colors} onChange={(event) => setColors(event.target.checked)} data-anatomy-colors />{ui.colors}</label><label><input type="checkbox" checked={xray} onChange={(event) => setXray(event.target.checked)} data-anatomy-xray />{ui.xray}</label></div><p className="sport-description mt-3">{text ? ui.pose : general.standing}</p></div>
          <aside className="anatomy-details min-w-0 space-y-5"><MuscleInformationPanel config={config} selected={selected} /><MuscleList config={config} selected={selected} onSelect={setSelected} /></aside>
        </div>
        <SportCard className="anatomy-variant">{config.partial && <h3 className="font-semibold" data-anatomy-partial>{general.partial}</h3>}{config.limitations.map((note, index) => <p key={index} className="sport-description mt-2">{note[language]}</p>)}<p className="sport-description mt-2">{general.classification}</p></SportCard>
      </div>
      {text && <><div id={`${id}-panel-technique`} role="tabpanel" aria-labelledby={`${id}-tab-technique`} hidden={tab !== "technique"}><SportCard className="anatomy-editorial"><h3 className="font-semibold">{text.objective}</h3><p className="sport-description mt-2">{text.description}</p><ol className="exercise-steps mt-5">{(["preparation", "position", "execution", "return"] as const).map((key, index) => <li key={key}><span aria-hidden="true">{index + 1}</span><p className="sport-description">{text[key]}</p></li>)}</ol></SportCard></div>
      <div id={`${id}-panel-mistakes`} role="tabpanel" aria-labelledby={`${id}-tab-mistakes`} hidden={tab !== "mistakes"}><SportCard className="anatomy-editorial"><h3 className="mb-3 font-semibold">{ui.mistakes}</h3><ul className="exercise-prose-list">{text.mistakes.map((item) => <li key={item}>{item}</li>)}</ul></SportCard></div>
      <div id={`${id}-panel-tips`} role="tabpanel" aria-labelledby={`${id}-tab-tips`} hidden={tab !== "tips"}><SportCard className="anatomy-editorial"><h3 className="mb-3 font-semibold">{ui.tips}</h3><ul className="exercise-prose-list">{[text.breathing, text.range, text.tempo, ...text.tips, text.safety].map((item) => <li key={item}>{item}</li>)}</ul></SportCard></div></>}
      <footer className="anatomy-credit"><p>{ui.credit}</p><p>{ui.adaptation}</p><a href="/models/anatomy/LICENSE-CC-BY-SA-4.0.txt" target="_blank" rel="noopener noreferrer">{ui.license}</a><a href="/models/anatomy/ATTRIBUTION-UPSTREAM.txt" target="_blank" rel="noopener noreferrer">{ui.source}</a><a href="/models/anatomy/SOURCE.json" target="_blank" rel="noopener noreferrer">{ui.provenance}</a><a href="https://github.com/slfresh/fitmitwith-anatomy-atlas/tree/4120ee68b6604b8f2f69105d6de6166fad4734c4" target="_blank" rel="noopener noreferrer">Fit Mit With</a>{config.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>)}</footer>
    </div>
  </dialog>;
}
