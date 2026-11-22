import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Public anatomy assets, their license notices and the installable-app files
    // (manifest, service worker, offline screen) need no session.
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|models/anatomy/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
