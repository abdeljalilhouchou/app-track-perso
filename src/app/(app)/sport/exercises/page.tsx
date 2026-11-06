import { getT } from "@/lib/i18n/get-dictionary";
import { loadExerciseCatalog } from "@/lib/exercises/data";
import { ExerciseLibrary } from "@/components/sport/exercises/exercise-library";
import { SportPageHeader } from "@/components/sport/ui/sport-primitives";

export default async function ExerciseLibraryPage({ searchParams }: { searchParams: Promise<{ discipline?: string }> }) {
  const [data, t, query] = await Promise.all([loadExerciseCatalog(), getT(), searchParams]);
  if (!data) return null;
  const discipline = ["musculation", "calisthenics", "running"].includes(query.discipline ?? "") ? query.discipline : "all";
  return <div className="space-y-5"><SportPageHeader title={t("sport.library.title")} description={t("sport.library.subtitle")} icon="exercise" /><ExerciseLibrary exercises={data.exercises} calisthenicsReady={data.calisthenicsReady} initialDiscipline={discipline} /></div>;
}
