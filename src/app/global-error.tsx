"use client";

import { useEffect, useState } from "react";
import { isStaleClientError, reloadOnce } from "@/lib/stale-client";

/**
 * Last-resort boundary for failures in the root layout. It renders its own document
 * without the app's styles or translations, so it stays plain and in French.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isStaleClientError(error) && reloadOnce()) setReloading(true);
  }, [error]);

  const button = { minHeight: 44, padding: "0 16px", borderRadius: 12, font: "600 14px system-ui, sans-serif", cursor: "pointer" } as const;
  return (
    <html lang="fr">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0b10", color: "#ececf3", fontFamily: "system-ui, sans-serif" }}>
        <main role="alert" style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          {reloading ? (
            <p>Nouvelle version disponible, rechargement…</p>
          ) : (
            <>
              <h1 style={{ fontSize: 20 }}>Cette page n’a pas pu s’afficher</h1>
              <p style={{ color: "#a1a1b5", lineHeight: 1.5 }}>Réessaie. Si ça recommence, recharge l’application : tes données enregistrées ne sont pas perdues.</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <button type="button" onClick={() => retry()} style={{ ...button, border: 0, background: "#818cf8", color: "#0b0b10" }}>Réessayer</button>
                <button type="button" onClick={() => window.location.reload()} style={{ ...button, border: "1px solid #2a2a3a", background: "transparent", color: "inherit" }}>Recharger l’application</button>
              </div>
            </>
          )}
        </main>
      </body>
    </html>
  );
}
