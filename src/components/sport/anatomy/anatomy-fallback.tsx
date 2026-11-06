"use client";

import type { KeyboardEvent } from "react";
import { MUSCLE_COLORS, ROWING_MUSCLES, type MuscleGroupId, type WorkingSide } from "@/lib/anatomy/rowing";
import { anatomyCopy } from "@/lib/anatomy/copy";
import { useLanguage } from "@/components/language-provider";

/** Original, explicitly schematic 2D landmarks. No simulated 3D rotation. */
export function AnatomyFallback({ back, side, selected, onSelect, colors, dark }: { back: boolean; side: WorkingSide; selected: MuscleGroupId | null; onSelect: (id: MuscleGroupId) => void; colors: boolean; dark: boolean }) {
  const { language } = useLanguage();
  const copy = anatomyCopy(language);
  const palette = MUSCLE_COLORS[dark ? "dark" : "light"];
  function shape(id: MuscleGroupId, path: string, mirrored = false, bilateral = false) {
    const group = ROWING_MUSCLES.find((group) => group.id === id)!;
    const active = bilateral || mirrored === (back ? side === "right" : side === "left");
    const choose = () => { if (active) onSelect(id); };
    const keyDown = (event: KeyboardEvent<SVGPathElement>) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(); } };
    return <path key={`${id}-${mirrored}`} d={path} transform={mirrored ? "translate(240 0) scale(-1 1)" : undefined}
      fill={colors && active ? palette[group.role] : palette.neutral} stroke={selected === id && active ? "var(--foreground)" : "var(--surface)"} strokeWidth={selected === id && active ? 2.5 : 1}
      tabIndex={active ? 0 : undefined} role={active ? "button" : undefined} aria-label={active ? `${copy.muscles[id].name} · ${copy.ui[group.role]}` : undefined}
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
      </g>)}
    </> : <>
      {[false, true].map((mirror) => <g key={String(mirror)}>
        {shape("biceps", "M68 100 80 97 77 122 64 136 58 131Z", mirror)}
        {shape("elbowFlexors", "M56 137 64 140 57 168 49 176 46 170Z", mirror)}
      </g>)}
      {shape("abdominals", "M100 121H140L138 174 120 190 102 174Z", false, true)}
    </>}
  </svg>;
}
