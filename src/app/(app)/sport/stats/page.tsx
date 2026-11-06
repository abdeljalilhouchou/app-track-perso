import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { ActivityBreakdown, SportHeatmap, SportRecords, SportTiles } from "@/components/sport/sport-overview";
import { WeeklyGoal } from "@/components/sport/weekly-goal";
import { getT } from "@/lib/i18n/get-dictionary";
import { loadSportHubData, sportWeeklyDuration } from "@/lib/sport-hub-data";
import { SportPageHeader } from "@/components/sport/ui/sport-primitives";

export default async function SportStatsPage() {
  const data = await loadSportHubData();
  if (!data) return null;
  const t = await getT();
  const chartData = sportWeeklyDuration(data.workouts, data.language);

  return (
    <div className="space-y-6 animate-fade-in">
      <SportPageHeader title={t("sport.hub.stats.title")} description={t("sport.hub.stats.description")} icon="stats" />
      <SportTiles stats={data.stats} />
      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklyGoal sessions={data.stats.thisWeek.sessions} goal={data.weeklyGoal} goalWeeks={data.stats.records.goalWeeks} />
        <SportRecords stats={data.stats} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("sport.page.minutesPerWeekTitle")}</h2>
          <WeeklyBarChart data={chartData} color="var(--sport)" unit={t("sport.common.min")} />
        </section>
        <ActivityBreakdown stats={data.stats} />
      </div>
      <SportHeatmap heat={data.stats.heat} />
    </div>
  );
}
