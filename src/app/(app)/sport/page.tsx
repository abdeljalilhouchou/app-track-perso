import { redirect } from "next/navigation";
import { SportDashboard } from "@/components/sport/sport-dashboard";
import { loadSportHubData } from "@/lib/sport-hub-data";
import { getT } from "@/lib/i18n/get-dictionary";

export default async function SportPage({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  const { date } = await searchParams;
  if (date !== undefined) {
    const selectedDate = Array.isArray(date) ? date[0] ?? "" : date;
    redirect("/sport/musculation?" + new URLSearchParams({ date: selectedDate }));
  }

  const [data, t] = await Promise.all([loadSportHubData({ dashboard: true }), getT()]);
  if (!data) return null;
  return <SportDashboard data={data} t={t} />;
}
