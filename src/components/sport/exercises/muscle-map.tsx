import { useT } from "@/components/language-provider";

type Zone = "chest" | "abs" | "biceps" | "forearms" | "frontDelts" | "quads" | "back" | "rearDelts" | "triceps" | "glutes" | "calves";
const regions: Record<string, { primary: Zone[]; secondary: Zone[] }> = {
  "one-arm-dumbbell-row": { primary: ["back"], secondary: ["rearDelts", "biceps", "abs"] },
  "barbell-bench-press": { primary: ["chest"], secondary: ["triceps", "frontDelts"] },
  "dumbbell-curl": { primary: ["biceps"], secondary: ["forearms"] },
  "push-up": { primary: ["chest", "triceps"], secondary: ["frontDelts", "abs"] },
  "forearm-plank": { primary: ["abs"], secondary: ["frontDelts", "glutes"] },
  "pull-up": { primary: ["back"], secondary: ["biceps", "forearms", "abs"] },
  "seated-cable-row": { primary: ["back"], secondary: ["rearDelts", "biceps"] },
  "bodyweight-squat": { primary: ["quads", "glutes"], secondary: ["abs", "calves"] },
};
export function MuscleMap({ guideId, primary, secondary }: { guideId: string | null; primary: string[]; secondary: string[] }) {
  const t = useT();
  const map = guideId ? regions[guideId] : undefined;
  if (!map) return <p className="sport-description">{t("sport.library.noAnatomy")}</p>;
  const zone = (name: Zone, d: string) => <path d={d} className={map.primary.includes(name) ? "muscle-zone-primary" : map.secondary.includes(name) ? "muscle-zone-secondary" : "muscle-zone-neutral"} />;
  return <figure className="exercise-anatomy">
    <div className="flex justify-center gap-5">
      {[false, true].map((back) => <div key={String(back)}><svg viewBox="0 0 120 240" width="120" height="240" role="img" aria-label={`${t(back ? "sport.library.back" : "sport.library.front")}. ${t("sport.library.primary")}: ${primary.join(", ")}. ${t("sport.library.secondary")}: ${secondary.join(", ")}`}>
        <g aria-hidden="true"><circle cx="60" cy="20" r="15" className="muscle-outline" /><path d="M47 38 30 45 21 84 10 119 20 123 34 91 39 74 39 119 33 162 35 222 47 222 57 161 60 141 63 161 73 222 85 222 87 162 81 119 81 74 86 91 100 123 110 119 99 84 90 45 73 38Z" className="muscle-outline" />
        {back ? <>
          {zone("back", "M44 49 59 45 76 49 75 76 66 99 60 108 54 99 45 76Z")}
          {zone("rearDelts", "M33 49 43 46 42 62 29 68Z M77 46 87 49 91 68 78 62Z")}
          {zone("triceps", "M27 72 38 66 35 87 25 98 21 94Z M82 66 93 72 99 94 95 98 85 87Z")}
          {zone("glutes", "M42 115 58 116 58 137 38 140Z M62 116 78 115 82 140 62 137Z")}
          {zone("calves", "M38 174 51 171 46 204 39 207Z M69 171 82 174 81 207 74 204Z")}
        </> : <>
          {zone("chest", "M43 51 58 49 58 70 44 69Z M62 49 77 51 76 69 62 70Z")}
          {zone("frontDelts", "M33 49 42 46 42 62 29 68Z M78 46 87 49 91 68 78 62Z")}
          {zone("biceps", "M28 72 38 67 35 86 25 94 23 91Z M82 67 92 72 97 91 95 94 85 86Z")}
          {zone("forearms", "M22 96 29 100 20 117 15 115Z M91 100 98 96 105 115 100 117Z")}
          {zone("abs", "M47 77H73L70 111 60 119 50 111Z")}
          {zone("quads", "M40 135 56 138 51 166 38 169Z M64 138 80 135 82 169 69 166Z")}
        </>}</g>
      </svg><p className="text-center text-xs text-foreground-muted">{t(back ? "sport.library.back" : "sport.library.front")}</p></div>)}
    </div><figcaption className="sport-description mt-4">{t("sport.library.simplified")}</figcaption>
  </figure>;
}
