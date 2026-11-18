"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string | null };

export async function updateDisplayName(name: string): Promise<ActionResult> {
  if (typeof name !== "string") return { error: "Nom invalide." };
  const display_name = name.trim();
  if (display_name.length < 1) return { error: "Le nom ne peut pas être vide." };
  if (display_name.length > 40) return { error: "40 caractères maximum." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };

  const { error } = await supabase.from("profiles").update({ display_name }).eq("id", user.id);
  if (error) return { error: "Impossible d’enregistrer le nom du profil." };

  revalidatePath("/", "layout");
  return { error: null };
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<ActionResult> {
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") return { error: "Mot de passe invalide." };
  if (newPassword.length < 6 || newPassword.length > 1024) return { error: "Le nouveau mot de passe doit contenir entre 6 et 1024 caractères." };
  if (newPassword === currentPassword) return { error: "Le nouveau mot de passe doit être différent de l'actuel." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Non connecté." };

  // Re-authenticate so a stolen session can't silently change the password.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) return { error: "Mot de passe actuel incorrect." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: "Impossible de modifier le mot de passe. Réessaie plus tard." };

  return { error: null };
}

export async function saveAvatarUrl(url: string | null): Promise<ActionResult> {
  if (url !== null && (typeof url !== "string" || url.length > 2048)) return { error: "Adresse de photo invalide." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };

  if (url !== null) {
    try {
      const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
      const candidate = new URL(url);
      const allowedPath = `/storage/v1/object/public/avatars/${user.id}/`;
      if (candidate.origin !== base.origin || !candidate.pathname.startsWith(allowedPath) || !/^https?:$/.test(candidate.protocol)) {
        return { error: "Adresse de photo invalide." };
      }
    } catch {
      return { error: "Adresse de photo invalide." };
    }
  }

  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) return { error: "Impossible d’enregistrer la photo de profil." };

  revalidatePath("/", "layout");
  return { error: null };
}
