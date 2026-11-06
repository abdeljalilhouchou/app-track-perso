import { useLanguage } from "@/components/language-provider";
import { anatomyCopy } from "@/lib/anatomy/copy";
import { ROWING_MUSCLES, type MuscleGroupId } from "@/lib/anatomy/rowing";

export function MuscleLegend() {
  const { language } = useLanguage();
  const { ui } = anatomyCopy(language);
  return <div className="anatomy-legend" role="group" aria-label={ui.legend}>{(["primary", "secondary", "stabilizer", "neutral"] as const).map((role) => <span key={role}><i aria-hidden="true" className={`anatomy-dot anatomy-role-${role}`} />{ui[role]}</span>)}</div>;
}
export function MuscleInformationPanel({ selected }: { selected: MuscleGroupId | null }) {
  const { language } = useLanguage();
  const copy = anatomyCopy(language);
  const group = ROWING_MUSCLES.find((group) => group.id === selected);
  if (!group) return null;
  return <div className="anatomy-information sport-card" role="status" aria-live="polite" aria-atomic="true" data-anatomy-selection={group.id} data-anatomy-role={group.role}>
    <div key={group.id} className="anatomy-selection-content">
      <div className="anatomy-information-heading"><span className="anatomy-information-eyebrow">{copy.ui.selected}</span><span className={`anatomy-role-label anatomy-role-${group.role}`}><i aria-hidden="true" className={`anatomy-dot anatomy-role-${group.role}`} />{copy.ui[group.role]}</span></div>
      <h3>{copy.muscles[group.id].name}</h3>
      <dl className="anatomy-action"><dt>{copy.ui.rowingRole}</dt><dd data-anatomy-action>{copy.actions[group.id]}</dd></dl>
      <p className="sport-description" data-anatomy-description>{copy.muscles[group.id].description}</p>
      {group.deep && <p className="sport-description anatomy-deep-note">{copy.ui.deep}</p>}
    </div>
  </div>;
}
export function MuscleList({ selected, onSelect }: { selected: MuscleGroupId | null; onSelect: (id: MuscleGroupId) => void }) {
  const { language } = useLanguage();
  const copy = anatomyCopy(language);
  return <div className="anatomy-muscles"><h3 className="font-semibold">{copy.ui.list}</h3><div className="anatomy-muscle-groups">{(["primary", "secondary", "stabilizer"] as const).map((role) => <section key={role} aria-label={copy.ui[`${role}Group`]}>
    <h4><i aria-hidden="true" className={`anatomy-dot anatomy-role-${role}`} />{copy.ui[`${role}Group`]}</h4>
    <ul className="anatomy-muscle-list">{ROWING_MUSCLES.filter((group) => group.role === role).map((group) => <li key={group.id}><button type="button" aria-pressed={selected === group.id} onClick={() => onSelect(group.id)} data-anatomy-muscle={group.id} className={selected === group.id ? "is-selected" : undefined}><span>{copy.muscles[group.id].name}</span><span aria-hidden="true" className="anatomy-muscle-check">{selected === group.id ? "✓" : "+"}</span></button></li>)}</ul>
  </section>)}</div></div>;
}
