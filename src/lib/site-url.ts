import { headers } from "next/headers";

/** Absolute origin of the current deployment, for building links that leave the app (e.g. emails). */
export async function getSiteUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://app-track-perso.vercel.app";
}
