import { format, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { computeStreak, countThisWeek } from "@/lib/streak";
import { HabitCreateModal } from "@/components/habit-create-modal";
import { HabitsBoard, type HabitCardData } from "@/components/habits-board";
import { SuggestedHabits } from "@/components/suggested-habits";
import { PausedHabits } from "@/components/paused-habits";
import { Callout } from "@/components/ui/callout";
import { MomentsJournal } from "@/components/moments-journal";
import { HabitsCalendar } from "@/components/habits/habits-calendar";
import { HabitsMonthly } from "@/components/habits/habits-monthly";
import { getDictionary, getT } from "@/lib/i18n/get-dictionary";
import { categorySlug } from "@/lib/habit-categories";

export default async function HabitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const dict = await getDictionary();
  const t = await getT();

  const since = format(subDays(new Date(), 400), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");

  const [{ data: habits }, { data: pausedHabits }, { data: logs }, { data: todayLogs }, { data: moments }] =
    await Promise.all([
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("position", { ascending: true }),
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("habit_logs")
        .select("habit_id, log_date")
        .eq("user_id", user.id)
        .gte("log_date", since),
      supabase.from("habit_logs").select("habit_id, note").eq("user_id", user.id).eq("log_date", today),
      supabase
        .from("moments")
        .select("*")
        .eq("user_id", user.id)
        .eq("entry_date", today)
        .order("occurred_at", { ascending: false }),
    ]);

  const logsByHabit = new Map<string, Set<string>>();
  for (const log of logs ?? []) {
    if (!logsByHabit.has(log.habit_id)) logsByHabit.set(log.habit_id, new Set());
    logsByHabit.get(log.habit_id)!.add(log.log_date);
  }

  const todayNoteByHabit = new Map<string, string | null>();
  for (const log of todayLogs ?? []) {
    todayNoteByHabit.set(log.habit_id, log.note);
  }

  const orderedHabits = habits ?? [];

  const groupsMap = new Map<string, HabitCardData[]>();
  orderedHabits.forEach((habit, globalIndex) => {
    const habitLogs = logsByHabit.get(habit.id) ?? new Set<string>();
    const values: Record<string, number> = {};
    habitLogs.forEach((d) => (values[d] = 1));

    const data: HabitCardData = {
      habit,
      values,
      doneToday: habitLogs.has(today),
      streak: computeStreak(habitLogs),
      thisWeekCount: countThisWeek(habitLogs),
      todayNote: todayNoteByHabit.get(habit.id) ?? null,
      isFirst: globalIndex === 0,
      isLast: globalIndex === orderedHabits.length - 1,
    };

    if (!groupsMap.has(habit.category)) groupsMap.set(habit.category, []);
    groupsMap.get(habit.category)!.push(data);
  });

  const groups = Array.from(groupsMap.entries()).map(([category, habits]) => ({ category, habits }));
  const allNames = [...orderedHabits, ...(pausedHabits ?? [])].map((h) => h.name);

  const doneTodayCount = orderedHabits.filter((h) => logsByHabit.get(h.id)?.has(today)).length;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-habit text-xl">
            ✨
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{dict.pages.habits.title}</h1>
            <p className="mt-0.5 text-sm text-foreground-muted">
              {orderedHabits.length > 0 ? (
                <>
                  {orderedHabits.length === 1
                    ? t("habits.page.activeHabitsOne", { count: orderedHabits.length })
                    : t("habits.page.activeHabitsOther", { count: orderedHabits.length })}{" "}
                  ·{" "}
                  <span className="font-medium" style={{ color: "var(--habit)" }}>
                    {doneTodayCount === 1
                      ? t("habits.page.doneTodayOne", { count: doneTodayCount })
                      : t("habits.page.doneTodayOther", { count: doneTodayCount })}
                  </span>
                </>
              ) : (
                dict.pages.habits.subtitle
              )}
            </p>
          </div>
        </div>
        <HabitCreateModal />
      </div>

      {orderedHabits.some((h) => h.category === "Sport") ? (
        <Callout variant="info" title={t("habits.page.sportLinkTitle")} icon="🔗" dismissKey="habits-sport-link" compact>
          {t("habits.page.sportLinkPrefix")} <strong>{t(`habits.categories.${categorySlug("Sport")}`)}</strong>{" "}
          {t("habits.page.sportLinkSuffix", { sport: t("nav.sport") })}
        </Callout>
      ) : (
        <Callout variant="tip" dismissKey="habits-sport-tip" compact>
          {t("habits.page.sportTipPrefix")} <strong>{t(`habits.categories.${categorySlug("Sport")}`)}</strong>
          {t("habits.page.sportTipSuffix")}
        </Callout>
      )}

      <MomentsJournal moments={moments ?? []} />

      <div className="rounded-2xl border-[1.5px] border-habit/50 bg-surface p-5">
        <SuggestedHabits existingNames={allNames} />
      </div>

      {orderedHabits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <span className="text-4xl">🌱</span>
          <p className="mt-3 text-sm text-foreground-muted">{t("habits.page.emptyState")}</p>
        </div>
      ) : (
        <HabitsBoard groups={groups} />
      )}

      {orderedHabits.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <HabitsCalendar
            today={today}
            habits={orderedHabits.map((h) => ({
              id: h.id,
              name: h.name,
              icon: h.icon,
              color: h.color,
              scheduledDays: h.scheduled_days,
              createdOn: h.created_at.slice(0, 10),
            }))}
            logs={Object.fromEntries(orderedHabits.map((h) => [h.id, Array.from(logsByHabit.get(h.id) ?? [])]))}
          />
          <HabitsMonthly habits={orderedHabits} logsByHabit={logsByHabit} />
        </div>
      )}

      <PausedHabits habits={pausedHabits ?? []} />
    </div>
  );
}
