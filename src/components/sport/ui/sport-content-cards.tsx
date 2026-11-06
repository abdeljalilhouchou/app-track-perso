import Link from "next/link";
import type { ReactNode } from "react";
import { SportBadge } from "./sport-primitives";
import { SportIcon, type SportIconName } from "./sport-icons";
import { SportMedia, type SportImageSource } from "./sport-media";

export function SportDisciplineCard({ href, title, description, icon, image, detail, compact = false }: { href: string; title: string; description?: string; icon: SportIconName; image?: SportImageSource; detail?: string; compact?: boolean }) {
  return <Link href={href} className={`sport-card sport-card-link sport-discipline-card${compact ? " sport-discipline-card-compact" : ""}`}>
    <SportMedia image={image} icon={icon} decorative sizes={compact ? "(max-width: 640px) 30vw, 22vw" : "(max-width: 640px) 100vw, 33vw"} />
    <div className="sport-content-card-body"><div className="flex items-center gap-2"><span className="sport-icon-tile"><SportIcon name={icon} /></span><h3 className="font-semibold">{title}</h3><SportIcon name="chevron" className="sport-chevron ms-auto h-4 w-4" /></div>{description && <p className="sport-description mt-3">{description}</p>}{detail && <p className="sport-card-detail mt-3">{detail}</p>}</div>
  </Link>;
}

export type SportCardMetric = { label: string; value: string; icon?: SportIconName };

export function WorkoutCard({ title, href, image, description, metrics = [], badge, children }: { title: string; href?: string; image?: SportImageSource; description?: string; metrics?: readonly SportCardMetric[]; badge?: string; children?: ReactNode }) {
  const body = <><div className="flex min-w-0 items-center gap-3"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl"><SportMedia image={image} ratio="square" sizes="64px" icon="strength" decorative /></div><div className="min-w-0 flex-1">{badge && <SportBadge>{badge}</SportBadge>}<h3 className="mt-1 break-words font-semibold">{title}</h3>{description && <p className="sport-description mt-1">{description}</p>}</div>{href && <SportIcon name="chevron" className="sport-chevron h-4 w-4 shrink-0" />}</div>{metrics.length > 0 && <dl className="sport-card-metrics">{metrics.map((metric) => <div key={metric.label}><dt>{metric.icon && <SportIcon name={metric.icon} className="h-3.5 w-3.5" />}{metric.label}</dt><dd><bdi>{metric.value}</bdi></dd></div>)}</dl>}</>;
  return <article className="sport-card sport-workout-card">{href ? <Link href={href} className="sport-content-card-body sport-card-link block">{body}</Link> : <div className="sport-content-card-body">{body}</div>}{children}</article>;
}

export function ExerciseCard({ title, href, image, muscleGroups = [], equipment, action, fallback, detail, prefetch }: { title: string; href?: string; image?: SportImageSource; muscleGroups?: readonly string[]; equipment?: string; action?: ReactNode; fallback?: ReactNode; detail?: string; prefetch?: boolean }) {
  const body = <><div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl"><SportMedia image={image} fallback={fallback} ratio="square" sizes="80px" icon="exercise" decorative /></div><div className="min-w-0 flex-1"><h3 className="break-words font-semibold">{title}</h3>{equipment && <p className="sport-description mt-1">{equipment}</p>}{muscleGroups.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{muscleGroups.map((muscle) => <SportBadge key={muscle} tone="accent">{muscle}</SportBadge>)}</div>}{detail && <p className="sport-card-detail mt-2">{detail}</p>}</div>{href && <SportIcon name="chevron" className="sport-chevron h-4 w-4 shrink-0" />}</>;
  return <article className="sport-card flex min-w-0 items-center">{href ? <Link href={href} prefetch={prefetch} className="sport-content-card-body sport-card-link flex min-w-0 flex-1 items-center gap-3">{body}</Link> : <div className="sport-content-card-body flex min-w-0 flex-1 items-center gap-3">{body}</div>}{action && <div className="pe-3">{action}</div>}</article>;
}
