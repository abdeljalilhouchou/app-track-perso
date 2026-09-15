import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { DayNavigator } from "@/components/journal/day-navigator";
import { DayFeed, type FeedItem } from "@/components/journal/day-feed";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const selectedDate = date ?? format(new Date(), "yyyy-MM-dd");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: habitLogs }, { data: habits }, { data: workouts }, { data: moodEntries }, { data: moments }] =
    await Promise.all([
      supabase
        .from("habit_logs")
        .select("id, habit_id, note, created_at")
        .eq("user_id", user.id)
        .eq("log_date", selectedDate),
      supabase.from("habits").select("id, icon, name").eq("user_id", user.id),
      supabase.from("workouts").select("*").eq("user_id", user.id).eq("workout_date", selectedDate),
      supabase.from("mood_entries").select("*").eq("user_id", user.id).eq("entry_date", selectedDate),
      supabase.from("moments").select("*").eq("user_id", user.id).eq("entry_date", selectedDate),
    ]);

  const habitById = new Map((habits ?? []).map((h) => [h.id, h]));
  const items: FeedItem[] = [];

  for (const log of habitLogs ?? []) {
    const habit = habitById.get(log.habit_id);
    if (!habit) continue;
    items.push({
      id: `habit-${log.id}`,
      type: "habit",
      time: log.created_at,
      icon: habit.icon,
      title: habit.name,
      subtitle: log.note ?? undefined,
      href: `/habits/${habit.id}`,
    });
  }

  for (const w of workouts ?? []) {
    items.push({
      id: `sport-${w.id}`,
      type: "sport",
      time: w.created_at,
      icon: "🏃",
      title: w.activity,
      subtitle: `${w.duration_minutes} min · intensité ${w.intensity}/5${w.notes ? ` · ${w.notes}` : ""}`,
      href: "/sport",
    });
  }

  for (const m of moodEntries ?? []) {
    const emoji = ["", "😞", "😕", "😐", "🙂", "😄"][m.mood_score] ?? "🙂";
    items.push({
      id: `mood-${m.id}`,
      type: "mood",
      time: m.created_at,
      icon: emoji,
      title: `Humeur : ${m.mood_score} / 5`,
      subtitle: `Énergie ${m.energy_level}/5${m.notes ? ` · ${m.notes}` : ""}`,
      href: "/humeur",
    });
  }

  for (const mo of moments ?? []) {
    const details = [
      mo.duration_minutes ? `${mo.duration_minutes} min` : null,
      mo.price != null ? `${mo.price} MAD` : null,
    ].filter(Boolean);
    items.push({
      id: `moment-${mo.id}`,
      type: "moment",
      time: mo.occurred_at,
      icon: mo.icon,
      title: mo.text,
      subtitle: details.length > 0 ? details.join(" · ") : undefined,
      href: "/habits",
    });
  }

  items.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const feedItems = items.map((item) => ({
    ...item,
    time: format(new Date(item.time), "HH:mm"),
  }));

  const heading = format(parseISO(selectedDate), "EEEE d MMMM", { locale: fr });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Choisis un jour et retrouve tout ce que tu y as fait.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <DayNavigator selectedDate={selectedDate} />

        <div className="mb-4 mt-6">
          <p className="text-lg font-semibold capitalize">{heading}</p>
          <p className="text-xs text-foreground-muted">
            {feedItems.length} activité{feedItems.length !== 1 ? "s" : ""} enregistrée
            {feedItems.length !== 1 ? "s" : ""}
          </p>
        </div>

        <DayFeed items={feedItems} />
      </div>
    </div>
  );
}
