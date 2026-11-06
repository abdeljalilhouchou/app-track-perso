"use client";

import { useT } from "@/components/language-provider";
import { SportButton, SportErrorState } from "@/components/sport/ui/sport-primitives";

export default function SportError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useT();
  return <SportErrorState title={t("sport.hubDashboard.loadError")} description={t("sport.hubDashboard.loadErrorBody")} action={<SportButton onClick={retry} icon="retry">{t("sport.hubDashboard.retry")}</SportButton>} />;
}
