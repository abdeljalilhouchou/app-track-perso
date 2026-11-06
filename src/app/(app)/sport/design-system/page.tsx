import { notFound } from "next/navigation";
import { SportDesignPreview } from "@/components/sport/ui/sport-design-preview";
import { loadSportHubData } from "@/lib/sport-hub-data";

// No product navigation link or public showcase. Explicit local preview only.
export default async function SportDesignSystemPage() {
  if (process.env.SPORT_UI_PREVIEW !== "true") notFound();
  const data = await loadSportHubData();
  if (!data) return null;
  return <SportDesignPreview stats={data.stats} weeklyGoal={data.weeklyGoal} latest={data.workouts[0] ?? null} />;
}
