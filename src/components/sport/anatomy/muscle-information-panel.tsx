import { useLanguage } from "@/components/language-provider";
import { anatomyCopy } from "@/lib/anatomy/copy";
import { generalAnatomyCopy } from "@/lib/anatomy/general-copy";
import { ATLAS_MUSCLES } from "@/lib/anatomy/atlas";
import type { ExerciseAnatomyConfig, MuscleGroupId } from "@/lib/anatomy/types";

export function MuscleLegend() {
  const { language } = useLanguage();
  const { ui } = anatomyCopy(language);
  return <div className="anatomy-legend" role="group" aria-label={ui.legend}>{(["primary", "secondary", "stabilizer", "neutral"] as const).map((role) => <span key={role}><i aria-hidden="true" className={`anatomy-dot anatomy-role-${role}`} />{ui[role]}</span>)}</div>;
}
export function MuscleInformationPanel({ config, selected }: { config: ExerciseAnatomyConfig; selected: MuscleGroupId | null }) {
  const { language } = useLanguage();
  const { ui } = anatomyCopy(language);
  const general = generalAnatomyCopy(language);
  const group = config.muscles.find((group) => group.id === selected);
  if (!group) return null;
  const rowing = anatomyCopy(language);
  const pilotCopy = config.unilateral ? rowing.muscles[group.id as keyof typeof rowing.muscles] : null;
  return <div className="anatomy-information sport-card" role="status" aria-live="polite" aria-atomic="true" data-anatomy-selection={group.id} data-anatomy-role={group.role}>
    <div key={group.id} className="anatomy-selection-content">
      <div className="anatomy-information-heading"><span className="anatomy-information-eyebrow">{ui.selected}</span><span className={`anatomy-role-label anatomy-role-${group.role}`}><i aria-hidden="true" className={`anatomy-dot anatomy-role-${group.role}`} />{ui[group.role]}</span></div>
      <h3>{pilotCopy?.name ?? ATLAS_MUSCLES[group.id].name[language]}</h3>
      <dl className="anatomy-action"><dt>{general.role}</dt><dd data-anatomy-action>{config.actions[group.id]?.[language]}</dd></dl>
      <p className="sport-description" data-anatomy-description>{pilotCopy?.description ?? `${ATLAS_MUSCLES[group.id].action[language]} ${config.limitations.map((note) => note[language]).join(" ")}`}</p>
      {group.unavailable ? <p className="sport-description anatomy-deep-note">{general.unavailable}</p> : group.deep && <p className="sport-description anatomy-deep-note">{general.deep}</p>}
    </div>
  </div>;
}
export function MuscleList({ config, selected, onSelect }: { config: ExerciseAnatomyConfig; selected: MuscleGroupId | null; onSelect: (id: MuscleGroupId) => void }) {
  const { language } = useLanguage();
  const { ui } = anatomyCopy(language);
  const general = generalAnatomyCopy(language);
  const rowing = anatomyCopy(language);
  return <div className="anatomy-muscles"><h3 className="font-semibold">{ui.list}</h3><div className="anatomy-muscle-groups">{(["primary", "secondary", "stabilizer"] as const).filter((role) => config.muscles.some((group) => group.role === role)).map((role) => <section key={role} aria-label={ui[`${role}Group`]}>
    <h4><i aria-hidden="true" className={`anatomy-dot anatomy-role-${role}`} />{ui[`${role}Group`]}</h4>
    <ul className="anatomy-muscle-list">{config.muscles.filter((group) => group.role === role).map((group) => <li key={group.id}><button type="button" aria-pressed={selected === group.id} onClick={() => onSelect(group.id)} data-anatomy-muscle={group.id} className={selected === group.id ? "is-selected" : undefined}><span>{config.unilateral ? rowing.muscles[group.id as keyof typeof rowing.muscles].name : ATLAS_MUSCLES[group.id].name[language]}{group.unavailable && <small className="block">{general.unavailable}</small>}</span><span aria-hidden="true" className="anatomy-muscle-check">{selected === group.id ? "✓" : "+"}</span></button></li>)}</ul>
  </section>)}</div></div>;
}
