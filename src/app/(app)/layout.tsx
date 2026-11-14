import { redirect } from "next/navigation";
import { getCurrentUser, getProfilePreferences } from "@/lib/supabase/read-context";
import { SidebarNav } from "@/components/sidebar-nav";
import { PageTransition } from "@/components/page-transition";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider";
import { ToastProvider } from "@/components/toast/toast-provider";
import { isTheme } from "@/lib/theme";
import { isLanguage } from "@/lib/language";
import { MotionConfig } from "framer-motion";
import { PerformanceMetrics } from "@/components/performance-metrics";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await getProfilePreferences();

  const displayName = profile?.display_name || user.email?.split("@")[0] || "toi";
  const theme = isTheme(profile?.theme) ? profile.theme : "system";
  const language = isLanguage(profile?.language) ? profile.language : "fr";

  return (
    <ToastProvider>
      <ThemeProvider initialTheme={theme}>
      <LanguageProvider initialLanguage={language}>
        <MotionConfig reducedMotion="user">
          <div className="app-shell flex min-h-dvh min-w-0 flex-col md:flex-row">
            {process.env.NEXT_PUBLIC_PERFORMANCE_DEBUG === "true" && <PerformanceMetrics />}
            <SidebarNav displayName={displayName} avatarUrl={profile?.avatar_url ?? null} />
            {/* The document scrolls, not <main>: a scroll container here would capture drag auto-scroll. */}
            <main className="app-main min-w-0 flex-1 overflow-x-clip">
              <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:px-10">
                <PageTransition>{children}</PageTransition>
              </div>
            </main>
          </div>
        </MotionConfig>
      </LanguageProvider>
      </ThemeProvider>
    </ToastProvider>
  );
}
