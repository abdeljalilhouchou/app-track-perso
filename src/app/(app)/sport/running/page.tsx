import { RunIcon } from "@/components/ui/nav-icons";
import { RunningWorkspace } from "@/components/sport/running-workspace";
import { getT } from "@/lib/i18n/get-dictionary";
import { isRunningSchemaReady } from "@/lib/running/config";
import { loadRunningData } from "@/lib/running/data";
import { format } from "date-fns";

export default async function RunningPage({ searchParams }: { searchParams: Promise<{ session?: string | string[] }> }) {
  const t = await getT();
  if (!isRunningSchemaReady()) {
    return <div className="space-y-6">
      <header className="rounded-3xl border border-sport/30 bg-surface p-5 sm:p-7">
        <span aria-hidden className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sport-soft text-sport"><RunIcon className="h-6 w-6" /></span>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("sport.runningUi.gateTitle")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground-muted">{t("sport.runningUi.gateBody")}</p>
      </header>
    </div>;
  }

  const [{ session: requestedSession }, data] = await Promise.all([searchParams, loadRunningData()]);
  if (!data) return null;
  const sessionId = Array.isArray(requestedSession) ? requestedSession[0] : requestedSession;
  return <RunningWorkspace initialRuns={data.runs} initialGoals={data.goals} language={data.language} initialDate={format(new Date(), "yyyy-MM-dd")} initialSessionId={sessionId} />;
}
