import { ActivityIcon, ChartIcon, DumbbellIcon, RunIcon, SparkleIcon } from "@/components/ui/nav-icons";
import { getT } from "@/lib/i18n/get-dictionary";

type Discipline = "calisthenics" | "running";

export async function SportPrepPage({ discipline }: { discipline: Discipline }) {
  const t = await getT();
  const isRunning = discipline === "running";
  const section = isRunning ? "running" : "calisthenics";
  const Icon = isRunning ? RunIcon : SparkleIcon;
  const cards = isRunning
    ? [
        { title: t("sport.hub.running.distanceTitle"), Icon: RunIcon },
        { title: t("sport.hub.running.paceTitle"), Icon: ActivityIcon },
        { title: t("sport.hub.running.progressTitle"), Icon: ChartIcon },
      ]
    : [
        { title: t("sport.hub.calisthenics.sessionsTitle"), Icon: DumbbellIcon },
        { title: t("sport.hub.calisthenics.skillsTitle"), Icon: SparkleIcon },
      ];

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="rounded-3xl border border-sport/30 bg-surface p-5 sm:p-7">
        <span aria-hidden className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sport-soft text-sport">
          <Icon className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t(`sport.hub.${section}.title`)}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground-muted">{t(`sport.hub.${section}.description`)}</p>
      </header>

      <section aria-label={t(`sport.hub.${section}.title`)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ title, Icon: CardIcon }) => (
          <div key={title} className="min-h-32 rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl bg-sport-soft text-sport">
              <CardIcon className="h-4.5 w-4.5" />
            </span>
            <h2 className="mt-3 text-sm font-semibold">{title}</h2>
            <p className="mt-1 text-xs text-foreground-muted">{t("sport.hub.notAvailableYet")}</p>
          </div>
        ))}
      </section>

      <div className="rounded-2xl border border-dashed border-sport/50 bg-sport-soft/40 p-5 sm:p-7">
        <span aria-hidden className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-sport">
          <ActivityIcon className="h-4.5 w-4.5" />
        </span>
        <h2 className="text-base font-semibold">{t(`sport.hub.${section}.emptyTitle`)}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-foreground-muted">{t(`sport.hub.${section}.emptyBody`)}</p>
      </div>
    </div>
  );
}
