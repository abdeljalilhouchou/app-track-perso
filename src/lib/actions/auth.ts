"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { isValidEmail } from "@/lib/actions/validation";

export type SignInState = { error: "invalid" | "unconfirmed" | null; email: string };

/** Returns an error code the page translates, and the email so the field keeps it after a refusal. */
export async function signIn(_prevState: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const kept = email.slice(0, 320);
  if (!isValidEmail(email) || password.length < 1 || password.length > 1024) return { error: "invalid", email: kept };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.code === "email_not_confirmed" ? "unconfirmed" : "invalid", email: kept };

  redirect("/dashboard");
}

export type SignUpState = { error: "invalid" | "failed" | null; email: string; displayName: string };

/** Returns an error code the page translates, with the name and email so they survive a refusal. */
export async function signUp(_prevState: SignUpState, formData: FormData): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const kept = { email: email.slice(0, 320), displayName: displayName.slice(0, 40) };

  if (!isValidEmail(email) || password.length < 6 || password.length > 1024 || displayName.length > 40) {
    return { error: "invalid", ...kept };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  if (error) return { error: "failed", ...kept };

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

type ForgotPasswordState = { error: string | null; sent: boolean };

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!isValidEmail(email)) return { error: "Entre une adresse e-mail valide.", sent: false };

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  // Supabase itself doesn't reveal whether the address is registered; we don't either, so this
  // form can't be used to check who has an account. A real send failure (bad SMTP, rate limit,
  // malformed address) is the one case worth surfacing.
  if (error && error.status !== 429 && !error.message.toLowerCase().includes("rate limit")) {
    return { error: "Impossible d’envoyer le lien. Réessaie plus tard.", sent: false };
  }

  return { error: null, sent: true };
}

type ResetPasswordState = { error: string | null };

export async function updatePasswordAfterReset(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6 || password.length > 1024) return { error: "Le mot de passe doit contenir entre 6 et 1024 caractères." };
  if (password !== confirm) return { error: "Les deux mots de passe ne correspondent pas." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Lien expiré ou déjà utilisé. Redemande un lien de réinitialisation." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Impossible de mettre à jour le mot de passe. Redemande un lien." };

  redirect("/dashboard");
}
