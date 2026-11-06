import type { ReactNode } from "react";
import { SportCard } from "./sport-primitives";
import { SportIcon, type SportIconName } from "./sport-icons";

export function SportStatCard({ label, value, unit, icon, detail, children }: { label: string; value: string | number; unit?: string; icon?: SportIconName; detail?: string; children?: ReactNode }) {
  return <SportCard className="sport-stat-card">
    <div className="flex items-start justify-between gap-2"><p className="sport-stat-label">{label}</p>{icon && <span className="sport-stat-icon"><SportIcon name={icon} className="h-4 w-4" /></span>}</div>
    <p className="sport-stat-value"><bdi>{value}</bdi>{unit && <span className="sport-stat-unit">{unit}</span>}</p>
    {detail && <p className="sport-description mt-1">{detail}</p>}
    {children && <div className="sport-stat-detail">{children}</div>}
  </SportCard>;
}
