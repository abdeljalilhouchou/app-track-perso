import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/read-context";
import { getDictionary, getT } from "@/lib/i18n/get-dictionary";
import { ProfileSubpageHeader } from "@/components/profile-subpage-header";
import { NotificationSettings } from "@/components/notifications/notification-settings";
import { parseSettings } from "@/lib/notifications";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const [dict, t, { data, error }] = await Promise.all([
    getDictionary(),
    getT(),
    supabase.from("notification_settings").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-fade-in" data-notifications-page>
      <ProfileSubpageHeader title={t("notify.title")} backLabel={dict.nav.profile} />
      {/* Before migration 0025 the tables do not exist: the page says so and stays read-only. */}
      <NotificationSettings initial={parseSettings(data)} schemaReady={!error} />
    </div>
  );
}
