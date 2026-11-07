"use client";

import { useLanguage } from "@/components/language-provider";
import { formatLocalizedDate } from "@/lib/format-date";
import type { ExerciseDetail } from "@/lib/exercises/types";
import { SportCard, SportLink, SportSectionHeading } from "../ui/sport-primitives";
import { SportStatCard } from "../ui/sport-stat-card";

export function ExercisePerformance({ data }: { data: ExerciseDetail }) {
  const { t, language } = useLanguage();
  const l = (key: string) => t(`sport.library.${key}`);
  const { exercise, performance } = data;
  const date = (value: string) => formatLocalizedDate(value, language, { day: "numeric", month: "short", year: "numeric" });
  const number = (value: number) => value.toLocaleString(language);
  return <section><SportSectionHeading title={l("performances")} /><SportCard>{performance.latest ? <><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{l("latest")} · {date(performance.latest.date)}</h3><SportLink variant="ghost" href={`/sport/${exercise.discipline === "calisthenics" ? "calisthenics?section=history&session=" : "musculation?tab=history&session="}${encodeURIComponent(performance.latest.workoutId)}&date=${performance.latest.date}`}>{t("sport.hubDashboard.history")}</SportLink></div><ol className="mt-3 space-y-2">{performance.latest.sets.map((set, index) => <li key={index} className="rounded-xl bg-surface-muted px-3 py-2 text-sm"><span className="text-foreground-muted">{l("set")} {number(index + 1)} · </span><bdi>{set.weight !== null && set.weight > 0 ? `${number(set.weight)} kg × ` : ""}{set.reps !== null ? `${number(set.reps)} ${l("reps")}` : ""}{set.seconds != null ? ` · ${number(set.seconds)} ${l("seconds")}` : ""}</bdi>{set.assistance != null && set.assistance > 0 && <span> · {l("assistance")}: <bdi>{number(set.assistance)} kg</bdi></span>}{set.addedWeight != null && set.addedWeight > 0 && <span> · {l("addedWeight")}: <bdi>{number(set.addedWeight)} kg</bdi></span>}{set.variation && <p className="sport-description mt-1">{set.variation}</p>}</li>)}</ol></> : <p className="sport-description">{l("noPerformance")}</p>}</SportCard>
      {(performance.maxWeight || performance.bestVolume) && <div className="mt-3 grid gap-3 sm:grid-cols-2">{performance.maxWeight && <SportStatCard icon="trophy" label={l("maxWeight")} value={`${number(performance.maxWeight.weight)} kg × ${number(performance.maxWeight.reps)}`} detail={date(performance.maxWeight.date)} />}{performance.bestVolume && <SportStatCard icon="volume" label={l("bestVolume")} value={number(performance.bestVolume.value)} unit="kg" detail={date(performance.bestVolume.date)} />}</div>}
      {performance.latest && <p className="sport-description mt-3">{l(exercise.discipline === "calisthenics" ? "calRecordsNote" : "recordsNote")}</p>}
    </section>;
}
