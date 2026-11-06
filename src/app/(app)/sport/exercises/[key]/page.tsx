import { notFound } from "next/navigation";
import { loadExerciseDetail } from "@/lib/exercises/data";
import { getT } from "@/lib/i18n/get-dictionary";
import { parseExerciseRequest } from "@/lib/exercises/request";
import { ExerciseDetailContent } from "@/components/sport/exercises/exercise-detail";
import { SportLink, SportPageHeader } from "@/components/sport/ui/sport-primitives";

export default async function ExercisePage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ key }, query, t] = await Promise.all([params, searchParams, getT()]);
  const parsed = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) if (typeof value === "string") parsed.set(name, value);
  const request = key === "lookup" ? parseExerciseRequest(parsed) : { key };
  if (!request) notFound();
  const data = await loadExerciseDetail(request);
  if (!data) notFound();
  return <div className="mx-auto max-w-3xl space-y-5"><SportLink variant="ghost" href={`/sport/exercises?discipline=${data.exercise.discipline}`}>{t("sport.library.title")}</SportLink><SportPageHeader title={data.exercise.name} eyebrow={t("sport.library.guide")} icon="exercise" /><ExerciseDetailContent data={data} /></div>;
}
