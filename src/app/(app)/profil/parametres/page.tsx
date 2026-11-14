import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/read-context";
import { ReminderSettings } from "@/components/reminder-settings";
import { ThemeSelector } from "@/components/theme-selector";
import { AccountSettings } from "@/components/account-settings";
import { LanguageSelector } from "@/components/language-selector";
import { ProfileSubpageHeader } from "@/components/profile-subpage-header";
import { Callout } from "@/components/ui/callout";
import { getDictionary, getT } from "@/lib/i18n/get-dictionary";

export default async function ProfilSettingsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const [dict, t, { data: profile, error: profileError }] = await Promise.all([
    getDictionary(),
    getT(),
    supabase.from("profiles")
      .select("display_name, reminder_time, avatar_url")
      .eq("id", user.id)
      .single(),
  ]);
  if (profileError) throw new Error("Impossible de charger le profil.");

  const displayName = profile?.display_name || user.email?.split("@")[0] || "toi";

  return (
    <div className="space-y-8 animate-fade-in">
      <ProfileSubpageHeader title={dict.nav.settings} backLabel={dict.nav.profile} />

      {/* These hints point at "Mon compte" and at the reminders further down: both live on this page. */}
      {!profile?.reminder_time && (
        <Callout variant="tip" title={t("profile.calloutReminder.title")} dismissKey="profile-reminder" compact>
          {t("profile.calloutReminder.text")}
        </Callout>
      )}
      {!profile?.avatar_url && (
        <Callout variant="info" title={t("profile.calloutCustomize.title")} dismissKey="profile-avatar" compact>
          {t("profile.calloutCustomize.text")}
        </Callout>
      )}

      <AccountSettings
        userId={user.id}
        email={user.email ?? ""}
        displayName={displayName}
        avatarUrl={profile?.avatar_url ?? null}
        memberSinceYear={new Date(user.created_at).getFullYear()}
      />

      <div className="rounded-2xl border-[1.5px] border-accent/40 bg-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft">🎨</span>
          {t("profile.appearanceHeading")}
        </h2>
        <ThemeSelector />
      </div>

      <div className="rounded-2xl border-[1.5px] border-accent/40 bg-surface p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-medium">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft">🌐</span>
          {dict.language.title}
        </h2>
        <p className="mb-3 text-xs text-foreground-muted">{dict.language.description}</p>
        <LanguageSelector />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft">🔔</span>
          {t("profile.reminders.heading")}
        </h2>
        <ReminderSettings initialTime={profile?.reminder_time ?? null} email={user.email ?? ""} />
      </div>
    </div>
  );
}
