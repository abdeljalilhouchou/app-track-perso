import Link from "next/link";

const FEATURES = [
  {
    icon: "✨",
    title: "Habitudes",
    color: "var(--habit)",
    soft: "var(--habit-soft)",
    desc: "Construis ta constance avec des séries et une carte façon GitHub.",
  },
  {
    icon: "🏃",
    title: "Sport",
    color: "var(--sport)",
    soft: "var(--sport-soft)",
    desc: "Logue tes séances et visualise ton volume hebdomadaire.",
  },
  {
    icon: "🙂",
    title: "Humeur",
    color: "var(--mood)",
    soft: "var(--mood-soft)",
    desc: "Suis ton énergie et ton moral, jour après jour.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold tracking-tight">
          track<span className="text-accent">.perso</span>
        </span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-foreground-muted hover:text-foreground">
            Se connecter
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition hover:opacity-90"
          >
            Commencer
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Tes habitudes, ton sport, ton humeur.
          <br />
          <span className="text-accent">Un seul endroit.</span>
        </h1>
        <p className="mt-5 max-w-xl text-balance text-foreground-muted">
          Suis ce qui compte vraiment, repère les liens entre ce que tu fais et comment tu te sens,
          et construis des séries dont tu es fier.
        </p>

        <div className="mt-8 flex gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-accent px-6 py-3 text-sm font-medium text-on-accent transition hover:opacity-90"
          >
            Créer un compte gratuit
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-border px-6 py-3 text-sm font-medium transition hover:bg-surface-muted"
          >
            J&apos;ai déjà un compte
          </Link>
        </div>

        <div className="mt-20 grid w-full gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border p-6 text-left"
              style={{ background: f.soft }}
            >
              <span className="text-2xl">{f.icon}</span>
              <h3 className="mt-3 font-semibold" style={{ color: f.color }}>
                {f.title}
              </h3>
              <p className="mt-1 text-sm text-foreground-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 py-6 text-center text-xs text-foreground-muted">
        track.perso — fait pour toi.
      </footer>
    </div>
  );
}
