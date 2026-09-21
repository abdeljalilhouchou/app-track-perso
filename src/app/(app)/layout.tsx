import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/sidebar-nav";
import { PageTransition } from "@/components/page-transition";
import { ThemeProvider } from "@/components/theme-provider";
import { isTheme } from "@/lib/theme";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, theme, avatar_url")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || user.email?.split("@")[0] || "toi";
  const theme = isTheme(profile?.theme) ? profile.theme : "system";

  return (
    <ThemeProvider initialTheme={theme}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <SidebarNav displayName={displayName} avatarUrl={profile?.avatar_url ?? null} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:px-10">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
