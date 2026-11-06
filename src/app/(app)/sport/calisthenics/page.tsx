import { ActivityIcon } from "@/components/ui/nav-icons";
import { CalisthenicsWorkspace } from "@/components/sport/calisthenics-workspace";
import { isCalisthenicsSchemaReady } from "@/lib/calisthenics/config";
import { loadCalisthenicsData } from "@/lib/calisthenics/data";
import { getT } from "@/lib/i18n/get-dictionary";

export default async function CalisthenicsPage({ searchParams }: { searchParams: Promise<{ session?: string | string[] }> }) {
  if (!isCalisthenicsSchemaReady()) {
    const t = await getT();
    return (
      <section className="rounded-3xl border border-dashed border-sport/50 bg-surface p-5 sm:p-8">
        <span aria-hidden className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sport-soft text-sport">
          <ActivityIcon className="h-6 w-6" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sport">Calisthenics</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("sport.calisthenicsUi.gateTitle")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground-muted">{t("sport.calisthenicsUi.gateBody")}</p>
      </section>
    );
  }

  const data = await loadCalisthenicsData();
  if (!data) return null;
  const { session } = await searchParams;
  const selectedSession = Array.isArray(session) ? session[0] : session;
  return <CalisthenicsWorkspace data={data} initialSessionId={selectedSession} />;
}
