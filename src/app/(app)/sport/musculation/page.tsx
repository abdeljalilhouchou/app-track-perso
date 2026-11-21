import { format, startOfWeek, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getProfilePreferences } from "@/lib/supabase/read-context";
import { Callout } from "@/components/ui/callout";
import { WorkoutForm } from "@/components/sport/workout-form";
import { SportTabs } from "@/components/sport/sport-tabs";
import { TodaySession } from "@/components/strength/today-session";
import { ProgramManager } from "@/components/strength/program-manager";
import { ProgressView } from "@/components/strength/progress-view";
import { HistoryView } from "@/components/strength/history-view";
import type { SessionItem } from "@/components/strength/types";
import type { CatalogItem, TemplateView } from "@/components/strength/types";
import { computeSportStats } from "@/lib/sport-stats";
import { computeStrengthData, suggestNextTemplate } from "@/lib/strength-stats";
import { muscleGroupI18nPath } from "@/lib/strength";
import { fetchAllRows } from "@/lib/paging";
import { getDictionary, getT } from "@/lib/i18n/get-dictionary";
import { isValidIsoDate } from "@/lib/actions/validation";
import Link from "next/link";
import { SportIcon } from "@/components/sport/ui/sport-icons";
import { sportTabFromQuery } from "@/lib/sport-navigation";

export default async function SportPage({ searchParams }: { searchParams: Promise<{ date?: string | string[]; tab?: string | string[] }> }) {
  const { date, tab } = await searchParams;
  const requestedDate = Array.isArray(date) ? date[0] : date;
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const today = format(new Date(), "yyyy-MM-dd");
  const [dict, t, allWorkouts, profileResult, sets, templatesRaw, templateRows, catalogRaw] = await Promise.all([
    getDictionary(),
    getT(),
    fetchAllRows((from, to) =>
      supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user.id)
        .order("workout_date", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to)
    ),
    getProfilePreferences(),
    fetchAllRows((from, to) =>
      supabase
        .from("workout_sets")
        .select("workout_id, exercise_name, muscle_group, exercise_position, set_number, reps, weight_kg")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("workout_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("workout_template_exercises")
        .select("*")
        .eq("user_id", user.id)
        .order("template_id", { ascending: true })
        .order("position", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("exercises")
        .select("name, muscle_group")
        .eq("user_id", user.id)
        .order("name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
  ]);
  if (profileResult.error) throw new Error("Impossible de charger l’objectif sportif.");
  const profile = profileResult.data;
  // Keep the established Muscle workspace scoped to its own sessions.
  // Rows without an explicit discipline remain visible as before.
  const all = allWorkouts.filter((workout) => workout.discipline !== "calisthenics" && workout.discipline !== "running");

  const weeklyGoal = profile?.sport_weekly_goal ?? 3;
  const stats = computeSportStats(all, weeklyGoal);

  // Program
  const templates: TemplateView[] = (templatesRaw ?? []).map((tRow) => ({
    id: tRow.id,
    name: tRow.name,
    muscleGroups: tRow.muscle_groups,
    exercises: (templateRows ?? [])
      .filter((e) => e.template_id === tRow.id)
      .sort((a, b) => a.position - b.position)
      .map((e) => ({ name: e.exercise_name, muscle: e.muscle_group, sets: e.target_sets, reps: e.target_reps })),
  }));
  const catalog: CatalogItem[] = (catalogRaw ?? []).map((c) => ({ name: c.name, muscle: c.muscle_group }));

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const doneThisWeek: Record<string, string> = {};
  for (const w of all) {
    if (w.template_id && w.workout_date >= weekStart && !doneThisWeek[w.template_id]) doneThisWeek[w.template_id] = w.workout_date;
  }
  const lastByTemplate: Record<string, { date: string; minutes: number }> = {};
  for (const w of all) {
    if (w.template_id && !lastByTemplate[w.template_id]) lastByTemplate[w.template_id] = { date: w.workout_date, minutes: w.duration_minutes };
  }
  const suggestedId = suggestNextTemplate(
    templates.map((tpl) => tpl.id),
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
  // Strength and the other activities logged here; calisthenics and running have their own pages.
  const here = all.filter((w) => w.discipline !== "calisthenics" && w.discipline !== "running");
  const historySessions = here.map(toItem);
  const templateIdByWorkout = Object.fromEntries(here.map((w) => [w.id, w.template_id]));
  const strengthWorkouts = here
    .filter((w) => w.discipline === "strength" || w.template_id || strength.details[w.id])
    .map((w) => ({ date: w.workout_date, minutes: w.duration_minutes, volume: strength.details[w.id]?.volume ?? null }));
  // Exercises whose top load beat every earlier session, per workout.
  const recordsByWorkout: Record<string, string[]> = {};
  for (const exercise of strength.exercises) {
    let best = 0;
    exercise.sessions.forEach((session, index) => {
      if (index > 0 && best > 0 && session.topWeight > best) (recordsByWorkout[session.workoutId] ??= []).push(exercise.name);
      best = Math.max(best, session.topWeight);
    });
  }

  // Quick-pick chips for the cardio form: skip the names that come from the strength program
  // (the "free session" default name is user-facing and translated; all language variants are
  // excluded here so the chip list stays clean regardless of which language a session was logged in)
  const strengthNames = new Set([
    ...templates.map((tpl) => tpl.name.toLowerCase()),
    "séance libre",
    "free session",
    "حصة حرة",
    "séance de musculation",
  ]);
  const cardioFavorites = stats.activities.filter((a) => !strengthNames.has(a.name.toLowerCase())).slice(0, 6);

  // Notes and warnings for the training week
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const trainedYesterday = new Set(all.filter((w) => w.workout_date === yesterday).flatMap((w) => w.muscle_groups ?? []));
  const suggestedTemplate = templates.find((tpl) => tpl.id === suggestedId);
  const overlap = suggestedTemplate ? suggestedTemplate.muscleGroups.filter((g) => trainedYesterday.has(g)) : [];
  const isoToday = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const missingSessions = weeklyGoal - stats.thisWeek.sessions;
  const daysLeft = 8 - isoToday;

  const muscleLabel = (group: string) => {
    const path = muscleGroupI18nPath(group);
    return path ? t(path) : group;
  };

  const notes = (
    <div className="space-y-2.5" data-focus-hide>
      {overlap.length > 0 && (
        <Callout variant="warning" title={t("sport.page.restWarningTitle")} dismissKey={`sport-rest:${today}`} compact>
          {t("sport.page.restWarningPrefix")} <strong>{overlap.map(muscleLabel).join(", ")}</strong> {t("sport.page.restWarningSuffix")}
        </Callout>
      )}
      {missingSessions > 0 && missingSessions >= daysLeft && (
        <Callout variant="warning" title={t("sport.page.goalAtRiskTitle")} dismissKey={`sport-goal-risk:${today}`} compact>
          {t("sport.page.goalAtRiskBody", {
            missing: missingSessions,
            missingUnit: t(missingSessions > 1 ? "sport.common.sessionOther" : "sport.common.sessionOne"),
            days: daysLeft,
            daysUnit: t(daysLeft > 1 ? "sport.common.dayOther" : "sport.common.dayOne"),
            goal: weeklyGoal,
          })}
        </Callout>
      )}
      {missingSessions <= 0 && stats.thisWeek.sessions > 0 && (
        <Callout variant="success" dismissKey={`sport-goal-done:${today}`} compact>
          {t("sport.page.goalReachedBody", { sessions: stats.thisWeek.sessions, goal: weeklyGoal })}
        </Callout>
      )}
      {templates.length > 0 && stats.totalSessions > 0 && sets.length === 0 && (
        <Callout variant="tip" dismissKey="sport-log-sets" compact>
          {t("sport.page.tipBody", { start: t("sport.todaySession.startSession"), markDone: t("sport.todaySession.markDone") })}
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
        lastByTemplate={lastByTemplate}
      />
    ),
    program: <ProgramManager templates={templates} catalog={catalog} suggestedId={suggestedId} />,
    progress: <ProgressView workouts={strengthWorkouts} exercises={strength.exercises} weeklyMuscles={strength.weeklyMuscles} weeklyGoal={weeklyGoal} />,
    history: <HistoryView sessions={historySessions} details={strength.details} records={recordsByWorkout} openDate={isValidIsoDate(requestedDate) ? requestedDate : null} today={today} templateIds={templateIdByWorkout} />,
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-center gap-3" data-strength-header data-focus-hide>
        <Link href="/sport" prefetch={false} aria-label={t("sport.focus.backToSport")} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-surface transition hover:bg-surface-muted">
          <SportIcon name="chevron" className="sport-context-back-icon h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold" style={{ color: "color-mix(in srgb, var(--sport) 62%, var(--foreground))" }}>
            {t("sport.focus.headerWeek", { done: stats.thisWeek.sessions, goal: weeklyGoal })}
          </p>
          <h1 className="truncate text-[26px] font-bold leading-tight tracking-tight">{dict.pages.sport.title}</h1>
        </div>
        <Link href="/sport/exercises?discipline=musculation" prefetch={false} className="flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 text-[13px] font-semibold transition hover:bg-surface-muted">
          <SportIcon name="exercise" className="h-[18px] w-[18px]" /><span>{t("sport.library.library")}</span>
        </Link>
      </header>

      {notes}

      <SportTabs panels={panels} initialTab={sportTabFromQuery(tab, date)} />
    </div>
  );
}
