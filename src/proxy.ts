import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Public anatomy assets and their license notices need no session refresh.
    "/((?!api|_next/static|_next/image|favicon.ico|models/anatomy/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
