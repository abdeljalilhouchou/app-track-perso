const SIZES = {
  sm: "h-8 w-8 text-sm",
  md: "h-11 w-11 text-lg",
  lg: "h-16 w-16 text-2xl",
  xl: "h-24 w-24 text-4xl",
} as const;

export function Avatar({
  name,
  url,
  size = "md",
  className = "",
}: {
  name: string;
  url?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const base = `shrink-0 rounded-full ${SIZES[size]} ${className}`;

  if (url) {
    return (
      // Plain <img>: the source is a user-uploaded Supabase Storage URL, already resized to 256px client-side.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={`Photo de ${name}`} className={`${base} object-cover`} />
    );
  }

  return (
    <div
      aria-hidden
      className={`${base} flex items-center justify-center font-semibold text-on-accent`}
      style={{ background: "var(--accent)" }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
