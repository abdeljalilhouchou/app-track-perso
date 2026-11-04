import { format, startOfWeek, subDays } from "date-fns";
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
import { computeStrengthData, suggestNextTemplate } from "@/lib/strength-stats";
import { muscleGroupI18nPath } from "@/lib/strength";
import { fetchAllRows } from "@/lib/paging";
import { getDictionary, getT } from "@/lib/i18n/get-dictionary";
import { isValidIsoDate } from "@/lib/actions/validation";
import { isLanguage } from "@/lib/language";
import { formatSportDate, sportWeeklyDuration } from "@/lib/sport-hub-data";

export default async function SportPage({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  const { date } = await searchParams;
  const requestedDate = Array.isArray(date) ? date[0] : date;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const dict = await getDictionary();
  const t = await getT();

  const today = format(new Date(), "yyyy-MM-dd");
  const selectedDate = isValidIsoDate(requestedDate) ? requestedDate : today;
  const [allWorkouts, profileResult, sets, templatesRaw, templateRows, catalogRaw] = await Promise.all([
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
    supabase.from("profiles").select("sport_weekly_goal, language").eq("id", user.id).single(),
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
  const language = isLanguage(profile?.language) ? profile.language : "fr";
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
  const selectedDaySessions = all.filter((w) => w.workout_date === selectedDate).map(toItem);
  const recentSessions = all.slice(0, 12).map(toItem);

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

  const chartData = sportWeeklyDuration(all, language, 10);

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
    <div className="space-y-2.5">
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
            basePath="/sport/musculation"
            markedDates={Array.from(new Set(all.map((w) => w.workout_date)))}
            markColor="var(--sport)"
          />
          <div className="mb-3 mt-6">
            <p className="text-lg font-semibold capitalize">
              {formatSportDate(selectedDate, language, { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p className="text-xs text-foreground-muted">
              {selectedDaySessions.length === 0
                ? t("sport.page.noSessionsThatDay")
                : t("sport.page.daySessionsCount", {
                    count: selectedDaySessions.length,
                    unit: t(selectedDaySessions.length > 1 ? "sport.common.sessionOther" : "sport.common.sessionOne"),
                  })}
            </p>
          </div>
          <SessionList
            sessions={selectedDaySessions}
            details={strength.details}
            emptyLabel={t("sport.page.restDayEmpty")}
            showDate={false}
          />
        </div>
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("sport.page.recentSessionsTitle")}</h2>
          <SessionList sessions={recentSessions} details={strength.details} emptyLabel={t("sport.common.noSessionsRecorded")} />
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
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("sport.page.minutesPerWeekTitle")}</h2>
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
