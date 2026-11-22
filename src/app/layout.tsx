import type { Metadata } from "next";
import type { Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { themeInitScript } from "@/lib/theme";
import { languageInitScript } from "@/lib/language";
import { AuthTransitionProvider } from "@/components/auth/auth-transition";
import { PwaRegister } from "@/components/pwa/pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "track.perso — Habitudes, sport, humeur",
  description: "Suis tes habitudes, ton sport et ton humeur au même endroit.",
  applicationName: "track.perso",
  // Opened from the iPhone home screen: full screen, content under the status bar
  // (the layout already pads for the safe areas).
  appleWebApp: { capable: true, title: "track.perso", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b10" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: languageInitScript }} />
      </head>
      <body className="min-h-full flex flex-col"><AuthTransitionProvider>{children}</AuthTransitionProvider><PwaRegister /></body>
    </html>
  );
}
