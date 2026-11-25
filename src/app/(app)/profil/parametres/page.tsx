import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/read-context";
import { ReminderSettings } from "@/components/reminder-settings";
import { ThemeSelector } from "@/components/theme-selector";
import { EmailSetting, IdentityCard, NameSetting, PasswordSetting, ReportSetting, SettingsRow, SettingsSection } from "@/components/account-settings";
import { LanguageSelector } from "@/components/language-selector";
import { ProfileSubpageHeader } from "@/components/profile-subpage-header";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LogOutIcon } from "@/components/ui/nav-icons";
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
  const email = user.email ?? "";
  const memberSinceYear = new Date(user.created_at).getFullYear();

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <ProfileSubpageHeader title={dict.nav.settings} backLabel={dict.nav.profile} />

      <IdentityCard userId={user.id} name={displayName} email={email} avatarUrl={profile?.avatar_url ?? null} memberSinceYear={memberSinceYear} />

      {/* Points at the Notifications section further down this page. */}
      {!profile?.reminder_time && (
        <Callout variant="tip" title={t("profile.calloutReminder.title")} dismissKey="profile-reminder" compact>
          {t("profile.calloutReminder.text")}
        </Callout>
      )}

      <SettingsSection id="settings-profile" title={t("profile.settingsPage.profileSection")}>
        <SettingsRow><NameSetting initialName={displayName} /></SettingsRow>
        <SettingsRow><EmailSetting email={email} /></SettingsRow>
      </SettingsSection>

      <SettingsSection id="settings-appearance" title={t("profile.settingsPage.appearanceSection")}>
        <SettingsRow><ThemeSelector /></SettingsRow>
      </SettingsSection>

      <SettingsSection id="settings-language" title={t("profile.settingsPage.languageSection")}>
        <SettingsRow><LanguageSelector /></SettingsRow>
      </SettingsSection>

      <SettingsSection id="settings-notifications" title={t("profile.settingsPage.notificationsSection")}>
        <SettingsRow>
          <Link href="/profil/notifications" className="-m-1 flex min-h-11 items-center gap-3 rounded-xl p-1 transition hover:bg-surface-muted" data-settings-push>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t("notify.row")}</span>
              <span className="block text-xs text-foreground-muted">{t("notify.rowHint")}</span>
            </span>
            <span aria-hidden className="text-lg text-foreground-muted rtl:rotate-180">›</span>
          </Link>
        </SettingsRow>
        <SettingsRow><ReminderSettings initialTime={profile?.reminder_time ?? null} email={email} /></SettingsRow>
      </SettingsSection>

      <SettingsSection id="settings-security" title={t("profile.settingsPage.securitySection")}>
        <SettingsRow className="py-2"><PasswordSetting /></SettingsRow>
      </SettingsSection>

      <SettingsSection id="settings-reports" title={t("profile.settingsPage.reportsSection")}>
        <SettingsRow><ReportSetting sinceYear={memberSinceYear} /></SettingsRow>
      </SettingsSection>

      <SettingsSection id="settings-session" title={t("profile.settingsPage.sessionSection")}>
        <SettingsRow className="space-y-2">
          <SignOutButton className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-danger/40 text-sm font-semibold text-danger transition hover:bg-danger/10">
            <LogOutIcon className="h-5 w-5" />
            {dict.nav.signOut}
          </SignOutButton>
          <p className="text-center text-xs text-foreground-muted">{t("profile.settingsPage.signOutHint")}</p>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
