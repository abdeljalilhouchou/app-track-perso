import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/paging";
import { isLanguage, type Language } from "@/lib/language";
import { isCalisthenicsSchemaReady } from "@/lib/calisthenics/config";
import type {
  CalisthenicsExercise,
  CalisthenicsProgram,
  CalisthenicsProgramExercise,
  CalisthenicsProgramSession,
  CalisthenicsSet,
  CalisthenicsSkill,
  CalisthenicsSkillLog,
  Workout,
} from "@/types/database";

export type CalisthenicsData = {
  language: Language;
  exercises: CalisthenicsExercise[];
  programs: (CalisthenicsProgram & {
    sessions: (CalisthenicsProgramSession & { exercises: CalisthenicsProgramExercise[] })[];
  })[];
  workouts: Workout[];
  sets: CalisthenicsSet[];
  skills: (CalisthenicsSkill & { logs: CalisthenicsSkillLog[] })[];
};

export async function loadCalisthenicsData(): Promise<CalisthenicsData | null> {
  if (!isCalisthenicsSchemaReady()) return null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile, exercises, programs, sessions, programExercises, workouts, sets, skills, logs] = await Promise.all([
    supabase.from("profiles").select("language").eq("id", user.id).maybeSingle(),
    fetchAllRows((from, to) => supabase.from("calisthenics_exercises").select("*")
      .order("category").order("exercise_key").range(from, to)),
    fetchAllRows((from, to) => supabase.from("calisthenics_programs").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).order("id").range(from, to)),
    fetchAllRows((from, to) => supabase.from("calisthenics_program_sessions").select("*")
      .eq("user_id", user.id).order("position").order("id").range(from, to)),
    fetchAllRows((from, to) => supabase.from("calisthenics_program_exercises").select("*")
      .eq("user_id", user.id).order("position").order("id").range(from, to)),
    fetchAllRows((from, to) => supabase.from("workouts").select("*")
      .eq("user_id", user.id).eq("discipline", "calisthenics")
      .order("workout_date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to)),
    fetchAllRows((from, to) => supabase.from("calisthenics_sets").select("*")
      .eq("user_id", user.id).order("workout_id").order("exercise_position").order("set_number").range(from, to)),
    fetchAllRows((from, to) => supabase.from("calisthenics_skills").select("*")
      .eq("user_id", user.id).order("updated_at", { ascending: false }).order("id").range(from, to)),
    fetchAllRows((from, to) => supabase.from("calisthenics_skill_logs").select("*")
      .eq("user_id", user.id).order("logged_on", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to)),
  ]);
  if (profile.error) throw new Error("Impossible de charger les préférences de langue.");

  return {
    language: isLanguage(profile.data?.language) ? profile.data.language : "fr",
    exercises,
    programs: programs.map((program) => ({
      ...program,
      sessions: sessions.filter((session) => session.program_id === program.id).map((session) => ({
        ...session,
        exercises: programExercises.filter((exercise) => exercise.program_session_id === session.id),
      })),
    })),
    workouts: workouts as Workout[],
    sets,
    skills: skills.map((skill) => ({ ...skill, logs: logs.filter((log) => log.skill_id === skill.id) })),
  };
}
