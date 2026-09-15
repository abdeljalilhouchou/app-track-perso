import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { logMood } from "@/lib/actions/mood";
import { MoodPicker } from "@/components/mood-picker";
import { MoodLineChart } from "@/components/charts/mood-line-chart";
import { MoodEntryList } from "@/components/mood-entry-list";

export default async function HumeurPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = format(new Date(), "yyyy-MM-dd");
  const since = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const { data: entries } = await supabase
    .from("mood_entries")
    .select("*")
    .eq("user_id", user.id)
    .gte("entry_date", since)
    .order("entry_date", { ascending: true });

  const todayEntry = entries?.find((e) => e.entry_date === today);

  const chartData = (entries ?? []).map((e) => ({
    label: format(new Date(e.entry_date), "d MMM", { locale: fr }),
    mood: e.mood_score,
    energy: e.energy_level,
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Humeur</h1>
        <p className="mt-1 text-sm text-foreground-muted">Comment te sens-tu aujourd&apos;hui ?</p>
      </div>

      <form action={logMood} className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <input type="hidden" name="entry_date" value={today} />

        <div>
          <p className="mb-2 text-sm font-medium">Humeur</p>
          <MoodPicker defaultValue={todayEntry?.mood_score ?? 3} />
        </div>

        <div>
          <label htmlFor="energy_level" className="mb-2 block text-sm font-medium">
            Niveau d&apos;énergie
          </label>
          <input
            id="energy_level"
            name="energy_level"
            type="range"
            min={1}
            max={5}
            defaultValue={todayEntry?.energy_level ?? 3}
            className="w-full accent-mood"
          />
        </div>

        <input
          name="notes"
          defaultValue={todayEntry?.notes ?? ""}
          placeholder="Notes (optionnel)"
          className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />

        <button
          type="submit"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          style={{ background: "var(--mood)" }}
        >
          {todayEntry ? "Mettre à jour" : "Enregistrer"}
        </button>
      </form>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-medium text-foreground-muted">30 derniers jours</h2>
        {chartData.length > 0 ? (
          <MoodLineChart data={chartData} />
        ) : (
          <p className="py-10 text-center text-sm text-foreground-muted">
            Pas encore assez de données pour afficher un graphique.
          </p>
        )}
      </div>

      {entries && entries.length > 0 && (
        <MoodEntryList entries={[...entries].reverse().slice(0, 10)} />
      )}
    </div>
  );
}
