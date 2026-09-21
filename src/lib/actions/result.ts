/** `notice` carries an optional extra message to show on success (e.g. "habit auto-checked"). */
export type ActionResult = { error: string | null; notice?: string };

export const ok: ActionResult = { error: null };

export function fail(message: string): ActionResult {
  return { error: message };
}

/** Turns a raw database error into something a person can act on. */
export function dbFail(error: { message: string; code?: string }): ActionResult {
  const m = error.message.toLowerCase();

  if (m.includes("schema cache") || m.includes("does not exist") || error.code === "42P01" || error.code === "42703") {
    return fail("La base de données doit être mise à jour (une migration SQL n'a pas encore été exécutée).");
  }
  if (m.includes("jwt") || m.includes("not authenticated") || m.includes("expired")) {
    return fail("Ta session a expiré : reconnecte-toi.");
  }
  if (m.includes("row-level security") || error.code === "42501") {
    return fail("Action refusée : tu n'as pas la permission de modifier cette donnée.");
  }
  if (m.includes("duplicate key") || error.code === "23505") {
    return fail("Cet élément existe déjà.");
  }
  if (m.includes("fetch failed") || m.includes("network")) {
    return fail("Connexion impossible. Vérifie ton réseau et réessaie.");
  }
  return fail(error.message);
}

export const NOT_SIGNED_IN = "Ta session a expiré : reconnecte-toi.";
