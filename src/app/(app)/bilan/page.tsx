import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/read-context";
import { fetchAllRows } from "@/lib/paging";
import { addDays, weekStart } from "@/lib/habits-v2";
import { buildWeeklyReview, evaluateGoal, isGoal, lastWeekStart, parseWeekStart, type Goal } from "@/lib/weekly-review";
import { WeeklyReviewView } from "@/components/review/weekly-review";

const CHUNK = 80;

export default async function BilanPage({ searchParams }: { searchParams: Promise<{ semaine?: string; story?: string }> }) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const params = await searchParams;
  const today = format(new Date(), "yyyy-MM-dd");
  const start = parseWeekStart(params.semaine, today) ?? lastWeekStart(today);
  const end = addDays(start, 6);
  // Four weeks for the facts; the week before is among them.
  const from = addDays(start, -21);
  const goalWeek = addDays(start, 7);
  const uid = user.id;

  const [profileResult, habits, habitLogs, workouts, moods, meals, sleepResult, goalsResult] = await Promise.all([
    supabase.from("profiles").select("goal_calories, goal_protein, sport_weekly_goal").eq("id", uid).single(),
    fetchAllRows((f, t) => supabase.from("habits").select("*").eq("user_id", uid).eq("archived", false).order("position").order("id").range(f, t)),
    fetchAllRows((f, t) => supabase.from("habit_logs").select("habit_id, log_date, value, is_joker").eq("user_id", uid)
      .gte("log_date", from).lte("log_date", end).order("log_date").order("habit_id").range(f, t)),
    fetchAllRows((f, t) => supabase.from("workouts").select("id, workout_date, duration_minutes, discipline").eq("user_id", uid)
      .gte("workout_date", from).lte("workout_date", end).order("workout_date").order("id").range(f, t)),
    fetchAllRows((f, t) => supabase.from("mood_entries").select("entry_date, mood_score, id").eq("user_id", uid)
      .gte("entry_date", from).lte("entry_date", end).order("entry_date").order("id").range(f, t)),
    fetchAllRows((f, t) => supabase.from("meal_entries").select("entry_date, calories, protein, id").eq("user_id", uid)
      .gte("entry_date", from).lte("entry_date", end).order("entry_date").order("id").range(f, t)),
    supabase.from("sleep_logs").select("wake_date, bedtime, duration_minutes").eq("user_id", uid).gte("wake_date", from).lte("wake_date", end),
    supabase.from("weekly_goals").select("week_start, goal_key, target").eq("user_id", uid).gte("week_start", start).lte("week_start", goalWeek),
  ]);
  if (profileResult.error) throw new Error("Impossible de charger le profil.");

  // Distances of the runs, by chunks of workout ids.
  const runIds = workouts.filter((w) => w.discipline === "running").map((w) => w.id);
  const runs: { workout_id: string; distance_km: number }[] = [];
  for (let i = 0; i < runIds.length; i += CHUNK) {
    const { data } = await supabase.from("running_sessions").select("workout_id, distance_km").eq("user_id", uid).in("workout_id", runIds.slice(i, i + CHUNK));
    runs.push(...(data ?? []));
  }

  const profile = profileResult.data;
  const review = buildWeeklyReview({
    start, today, habits, habitLogs, workouts, runs, moods, meals,
    // Before migration 0023 there is no sleep table: the review simply has no nights.
    sleep: sleepResult.error ? [] : sleepResult.data ?? [],
    goals: { calories: profile?.goal_calories ?? null, protein: profile?.goal_protein ?? null, sportWeekly: profile?.sport_weekly_goal ?? 3 },
  });

  // Before migration 0024 there is no goal table: the goal part is hidden.
  const goalsReady = !goalsResult.error;
  const goalOf = (week: string): Goal | null => {
    const row = goalsResult.data?.find((g) => g.week_start === week);
    const goal = row ? { key: row.goal_key, target: row.target } : null;
    return goal && isGoal(goal) ? goal : null;
  };
  const thisGoal = goalOf(start);
  const current = weekStart(today);
  // A goal can be chosen for this week or the next one only.
  const canChoose = goalsReady && goalWeek >= current && goalWeek <= addDays(current, 7);

  return (
    <WeeklyReviewView
      review={review}
      today={today}
      prevWeek={start > addDays(current, -7 * 52) ? addDays(start, -7) : null}
      nextWeek={start < current ? addDays(start, 7) : null}
      goalCheck={thisGoal ? evaluateGoal(thisGoal, review.week) : null}
      goalWeek={canChoose ? goalWeek : null}
      goalThisWeek={goalWeek === current}
      chosenGoal={goalOf(goalWeek)}
      calorieGoal={profile?.goal_calories ?? null}
      openStory={params.story === "1"}
    />
  );
}
