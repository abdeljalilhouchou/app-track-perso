import Link from "next/link";

/** Title block shared by the profile sub-pages, with a way back to the profile overview. */
export function ProfileSubpageHeader({ title, backLabel }: { title: string; backLabel: string }) {
  return (
    <div>
      <Link
        href="/profil"
        className="-ms-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-medium text-accent transition hover:bg-surface-muted"
      >
        <span aria-hidden className="rtl:rotate-180">‹</span>
        {backLabel}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
    </div>
  );
}
