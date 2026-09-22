import { format, parseISO, startOfWeek, subDays, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { DayNavigator } from "@/components/journal/day-navigator";
import { Callout } from "@/components/ui/callout";
import { InViewFade } from "@/components/ui/in-view-fade";
import { WorkoutForm } from "@/components/sport/workout-form";
import { WeeklyGoal } from "@/components/sport/weekly-goal";
import { SportTabs } from "@/components/sport/sport-tabs";
import { ActivityBreakdown, SportHeatmap, SportRecords, SportTiles } from "@/components/sport/sport-overview";
import { TodaySession } from "@/components/strength/today-session";
import { ProgramManager } from "@/components/strength/program-manager";
import { MuscleVolume, Progression } from "@/components/strength/progression";
import { SessionList, type SessionItem } from "@/components/strength/session-list";
import type { CatalogItem, TemplateView } from "@/components/strength/types";
import { computeSportStats } from "@/lib/sport-stats";
import { computeStrengthData, suggestNextTemplate, type RawSet } from "@/lib/strength-stats";
import { weeklyTotals } from "@/lib/weekly";
import { getDictionary } from "@/lib/i18n/get-dictionary";

const PAGE_SIZE = 1000;

export default async function SportPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const dict = await getDictionary();

  const today = format(new Date(), "yyyy-MM-dd");
  const selectedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;
  const setsSince = subDays(new Date(), 400).toISOString();

  // PostgREST caps a response at 1000 rows and a 4x/week program logs hundreds of sets a month: page through.
  async function fetchSets(): Promise<RawSet[]> {
    const rows: RawSet[] = [];
    for (let page = 0; page < 10; page++) {
      const { data } = await supabase
        .from("workout_sets")
        .select("workout_id, exercise_name, muscle_group, exercise_position, set_number, reps, weight_kg")
        .eq("user_id", user!.id)
        .gte("created_at", setsSince)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const batch = (data ?? []) as RawSet[];
      rows.push(...batch);
      if (batch.length < PAGE_SIZE) break;
    }
    return rows;
  }

  const [{ data: workouts }, { data: profile }, sets, { data: templatesRaw }, { data: templateRows }, { data: catalogRaw }] =
    await Promise.all([
    supabase
      .from("workouts")
      .select("*")
      .eq("user_id", user.id)
      .order("workout_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("sport_weekly_goal").eq("id", user.id).single(),
    fetchSets(),
    supabase
      .from("workout_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("workout_template_exercises").select("*").eq("user_id", user.id),
    supabase.from("exercises").select("name, muscle_group").eq("user_id", user.id).order("name", { ascending: true }),
  ]);

  const all = workouts ?? [];
  const weeklyGoal = profile?.sport_weekly_goal ?? 3;
  const stats = computeSportStats(all, weeklyGoal);

  // Program
  const templates: TemplateView[] = (templatesRaw ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    muscleGroups: t.muscle_groups,
    exercises: (templateRows ?? [])
      .filter((e) => e.template_id === t.id)
      .sort((a, b) => a.position - b.position)
      .map((e) => ({ name: e.exercise_name, muscle: e.muscle_group, sets: e.target_sets, reps: e.target_reps })),
  }));
  const catalog: CatalogItem[] = (catalogRaw ?? []).map((c) => ({ name: c.name, muscle: c.muscle_group }));

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const doneThisWeek: Record<string, string> = {};
  for (const w of all) {
    if (w.template_id && w.workout_date >= weekStart && !doneThisWeek[w.template_id]) doneThisWeek[w.template_id] = w.workout_date;
  }
  const suggestedId = suggestNextTemplate(
    templates.map((t) => t.id),
    all
  );

  // Strength analytics
  const workoutDates = Object.fromEntries(all.map((w) => [w.id, w.workout_date]));
  const strength = computeStrengthData(sets, workoutDates);

  const toItem = (w: (typeof all)[number]): SessionItem => ({
    id: w.id,
    date: w.workout_date,
    activity: w.activity,
    duration: w.duration_minutes,
    intensity: w.intensity,
    notes: w.notes,
    muscleGroups: w.muscle_groups ?? [],
  });
  const selectedDaySessions = all.filter((w) => w.workout_date === selectedDate).map(toItem);
  const recentSessions = all.slice(0, 12).map(toItem);

  // Quick-pick chips for the cardio form: skip the names that come from the strength program
  const strengthNames = new Set([...templates.map((t) => t.name.toLowerCase()), "séance libre", "séance de musculation"]);
  const cardioFavorites = stats.activities.filter((a) => !strengthNames.has(a.name.toLowerCase())).slice(0, 6);

  const since = format(subWeeks(new Date(), 10), "yyyy-MM-dd");
  const chartData = weeklyTotals(
    all.filter((w) => w.workout_date >= since).map((w) => ({ date: w.workout_date, value: w.duration_minutes })),
    10
  );

  // Notes and warnings for the training week
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const trainedYesterday = new Set(all.filter((w) => w.workout_date === yesterday).flatMap((w) => w.muscle_groups ?? []));
  const suggestedTemplate = templates.find((t) => t.id === suggestedId);
  const overlap = suggestedTemplate ? suggestedTemplate.muscleGroups.filter((g) => trainedYesterday.has(g)) : [];
  const isoToday = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const missingSessions = weeklyGoal - stats.thisWeek.sessions;
  const daysLeft = 8 - isoToday;

  const notes = (
    <div className="space-y-2.5">
      {overlap.length > 0 && (
        <Callout variant="warning" title="Repos musculaire" dismissKey={`sport-rest:${today}`} compact>
          Tu as travaillé <strong>{overlap.join(", ")}</strong> hier. Les muscles ont besoin d&apos;environ 48 h pour
          récupérer : choisis plutôt une autre séance, ou allège les charges.
        </Callout>
      )}
      {missingSessions > 0 && missingSessions >= daysLeft && (
        <Callout variant="warning" title="Objectif de la semaine en danger" dismissKey={`sport-goal-risk:${today}`} compact>
          Il te reste {missingSessions} séance{missingSessions > 1 ? "s" : ""} pour {daysLeft} jour{daysLeft > 1 ? "s" : ""} :
          impossible de rater un jour pour atteindre {weeklyGoal} séances.
        </Callout>
      )}
      {missingSessions <= 0 && stats.thisWeek.sessions > 0 && (
        <Callout variant="success" dismissKey={`sport-goal-done:${today}`} compact>
          Objectif de la semaine atteint ({stats.thisWeek.sessions}/{weeklyGoal}). Pense à bien récupérer et à manger assez de
          protéines.
        </Callout>
      )}
      {templates.length > 0 && stats.totalSessions > 0 && sets.length === 0 && (
        <Callout variant="tip" dismissKey="sport-log-sets" compact>
          Astuce : lance la séance avec « Démarrer la séance » et note tes charges pour suivre ta progression et tes records.
          « Marquer comme fait » ne garde pas le détail des séries.
        </Callout>
      )}
    </div>
  );

  const panels = {
    session: (
      <TodaySession
        templates={templates}
        doneThisWeek={doneThisWeek}
        suggestedId={suggestedId}
        sessionsThisWeek={stats.thisWeek.sessions}
        goal={weeklyGoal}
        summaries={strength.exercises}
        catalog={catalog}
        today={today}
        cardio={<WorkoutForm today={today} favorites={cardioFavorites} />}
      />
    ),
    program: <ProgramManager templates={templates} catalog={catalog} />,
    progress: (
      <>
        <MuscleVolume weeklyMuscles={strength.weeklyMuscles} />
        <Progression exercises={strength.exercises} />
      </>
    ),
    history: (
      <>
        <div className="rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5">
          <DayNavigator
            selectedDate={selectedDate}
            basePath="/sport"
            markedDates={Array.from(new Set(all.map((w) => w.workout_date)))}
            markColor="var(--sport)"
          />
          <div className="mb-3 mt-6">
            <p className="text-lg font-semibold capitalize">{format(parseISO(selectedDate), "EEEE d MMMM", { locale: fr })}</p>
            <p className="text-xs text-foreground-muted">
              {selectedDaySessions.length === 0
                ? "Aucune séance ce jour-là"
                : `${selectedDaySessions.length} séance${selectedDaySessions.length > 1 ? "s" : ""}`}
            </p>
          </div>
          <SessionList
            sessions={selectedDaySessions}
            details={strength.details}
            emptyLabel="Repos ce jour-là. Choisis un jour marqué d'un point vert pour revoir une séance."
            showDate={false}
          />
        </div>
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Dernières séances</h2>
          <SessionList sessions={recentSessions} details={strength.details} emptyLabel="Aucune séance enregistrée pour le moment." />
        </div>
      </>
    ),
    stats: (
      <>
        <SportTiles stats={stats} />
        <div className="grid gap-4 lg:grid-cols-2">
          <WeeklyGoal sessions={stats.thisWeek.sessions} goal={weeklyGoal} goalWeeks={stats.records.goalWeeks} />
          <SportRecords stats={stats} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <InViewFade className="rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Minutes par semaine</h2>
            <WeeklyBarChart data={chartData} color="var(--sport)" unit="min" />
          </InViewFade>
          <ActivityBreakdown stats={stats} />
        </div>
        <SportHeatmap heat={stats.heat} />
      </>
    ),
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-sport text-xl">
          🏋️
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dict.pages.sport.title}</h1>
          <p className="mt-0.5 text-sm text-foreground-muted">{dict.pages.sport.subtitle}</p>
        </div>
      </div>

      {notes}

      <SportTabs panels={panels} initialTab={date ? "history" : "session"} />
    </div>
  );
}
