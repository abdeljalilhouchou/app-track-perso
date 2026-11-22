import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims checks the session token's signature locally (no Auth server round trip
  // with asymmetric signing keys) and refreshes an expired session like getUser did.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname.startsWith("/forgot-password") ||
    request.nextUrl.pathname.startsWith("/auth");

  // Left out of isAuthRoute on purpose: the recovery link signs the user in via /auth/callback
  // before landing here, so redirecting signed-in visitors away (like other auth routes) would
  // bounce them to /dashboard before they can set a new password.
  const isResetPasswordRoute = request.nextUrl.pathname.startsWith("/reset-password");

  const isPublicRoute = request.nextUrl.pathname === "/";

  if (!user && !isAuthRoute && !isPublicRoute && !isResetPasswordRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
