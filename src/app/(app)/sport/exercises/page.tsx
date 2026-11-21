import { loadExerciseCatalog } from "@/lib/exercises/data";
import { ExerciseLibrary } from "@/components/sport/exercises/exercise-library";

export default async function ExerciseLibraryPage({ searchParams }: { searchParams: Promise<{ discipline?: string }> }) {
  const [data, query] = await Promise.all([loadExerciseCatalog(), searchParams]);
  if (!data) return null;
  const discipline = ["musculation", "calisthenics", "running"].includes(query.discipline ?? "") ? query.discipline : "all";
  return <div className="space-y-5"><ExerciseLibrary exercises={data.exercises} calisthenicsReady={data.calisthenicsReady} initialDiscipline={discipline} /></div>;
}
