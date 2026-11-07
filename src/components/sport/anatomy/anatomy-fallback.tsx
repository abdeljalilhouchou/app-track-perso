"use client";

import type { KeyboardEvent } from "react";
import { MUSCLE_COLORS, type WorkingSide } from "@/lib/anatomy/rowing";
import type { ExerciseAnatomyConfig, MuscleGroupId } from "@/lib/anatomy/types";
import { ATLAS_MUSCLES } from "@/lib/anatomy/atlas";
import { anatomyCopy } from "@/lib/anatomy/copy";
import { useLanguage } from "@/components/language-provider";

/** Original, explicitly schematic 2D landmarks. No simulated 3D rotation. */
export function AnatomyFallback({ config, back, side, selected, onSelect, colors, dark }: { config: ExerciseAnatomyConfig; back: boolean; side: WorkingSide; selected: MuscleGroupId | null; onSelect: (id: MuscleGroupId) => void; colors: boolean; dark: boolean }) {
  const { language } = useLanguage();
  const copy = anatomyCopy(language);
  const palette = MUSCLE_COLORS[dark ? "dark" : "light"];
  function shape(id: MuscleGroupId, path: string, mirrored = false, bilateral = false) {
    const group = config.muscles.find((group) => group.id === id);
    const active = !!group && (!config.unilateral || group.role === "stabilizer" || bilateral || mirrored === (back ? side === "right" : side === "left"));
    const choose = () => { if (active) onSelect(id); };
    const keyDown = (event: KeyboardEvent<SVGPathElement>) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(); } };
    return <path key={`${id}-${mirrored}`} d={path} transform={mirrored ? "translate(240 0) scale(-1 1)" : undefined}
      fill={colors && active ? palette[group!.role] : palette.neutral} stroke={selected === id && active ? "var(--foreground)" : "var(--surface)"} strokeWidth={selected === id && active ? 2.5 : 1}
      tabIndex={active ? 0 : undefined} role={active ? "button" : undefined} aria-label={active ? `${ATLAS_MUSCLES[id].name[language]} · ${copy.ui[group!.role]}` : undefined}
      onClick={choose} onKeyDown={keyDown} className={active ? "anatomy-fallback-muscle" : undefined} />;
  }
  return <svg viewBox="0 0 240 360" role="group" aria-label={`${copy.ui.fallback} · ${back ? copy.ui.back : copy.ui.front}`} className="anatomy-fallback-svg">
    <circle cx="120" cy="32" r="23" fill={palette.neutral} /><path d="M101 59 73 69 57 116 40 178 48 189 60 183 79 131 86 111 86 188 76 238 82 326 99 335 109 242 120 208 131 242 141 335 158 326 164 238 154 188 154 111 161 131 180 183 192 189 200 178 183 116 167 69 139 59Z" fill={palette.neutral} stroke="var(--foreground-muted)" strokeWidth="1.2" />
    {back ? <>
      {[false, true].map((mirror) => <g key={String(mirror)}>
        {shape("lats", "M87 112 106 120 115 163 112 190 100 178 87 147Z", mirror)}
        {shape("middleTraps", "M91 86 116 91 115 105 98 103Z", mirror)}
        {shape("lowerTraps", "M100 106 116 109 116 146 110 139Z", mirror)}
        {shape("rhomboids", "M95 103 109 106 106 121 91 117Z", mirror)}
        {shape("rearDeltoid", "M74 74 88 71 89 91 69 99Z", mirror)}
        {shape("spinalStabilizers", "M115 148 118 148 118 194 112 194Z", mirror, true)}
        {shape("upperTraps", "M107 63 116 61 116 88 91 82Z", mirror)}
        {shape("triceps", "M68 100 80 97 77 122 64 136 58 131Z", mirror)}
        {shape("glutes", "M89 178 117 182 117 210 102 221 81 209Z", mirror)}
        {shape(config.muscles.some((g) => g.id === "hipHamstrings") ? "hipHamstrings" : "hamstrings", "M83 218 103 227 106 264 89 266Z", mirror)}
        {shape("gastrocnemius", "M87 274 103 273 101 303 90 308Z", mirror)}
        {shape("soleus", "M90 308 101 305 99 322 91 323Z", mirror)}
        {shape("hipAbductors", "M85 175 99 178 84 199 81 194Z", mirror)}
      </g>)}
    </> : <>
      {[false, true].map((mirror) => <g key={String(mirror)}>
        {shape("biceps", "M68 100 80 97 77 122 64 136 58 131Z", mirror)}
        {shape("elbowFlexors", "M56 137 64 140 57 168 49 176 46 170Z", mirror)}
        {shape("upperChest", "M91 79 117 79 117 89 90 93Z", mirror)}
        {shape("chest", "M90 94 117 90 117 106 91 109Z", mirror)}
        {shape("lowerChest", "M92 110 117 107 117 116 99 118Z", mirror)}
        {shape("frontDeltoid", "M75 75 87 74 86 94 72 99Z", mirror)}
        {shape("lateralDeltoid", "M69 81 74 77 70 100 64 110 61 106Z", mirror)}
        {shape("wristFlexors", "M48 169 57 170 54 179 47 183Z", mirror)}
        {shape("grip", "M51 149 58 150 56 167 49 168Z", mirror)}
        {shape("quadriceps", "M84 216 107 223 105 265 86 264Z", mirror)}
      </g>)}
      {shape(config.muscles.some((g) => g.id === "rectusAbs") ? "rectusAbs" : "abdominals", "M108 122H132L131 170 120 185 109 170Z", false, true)}
      {shape("obliques", "M98 124 106 127 107 169 115 185 103 173Z")}
      {shape("obliques", "M98 124 106 127 107 169 115 185 103 173Z", true)}
    </>}
  </svg>;
}
