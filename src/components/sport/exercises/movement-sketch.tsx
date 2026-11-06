// Original code-native replacement diagrams. Not photographs or anatomical atlases.
export function MovementSketch({ id }: { id?: string | null }) {
  const scene = id === "forearm-plank" ? <><circle cx="177" cy="42" r="10" /><path d="M165 51 123 62 55 77 32 93M162 53 165 87 191 87M55 77 46 92" /></>
    : id === "pull-up" ? <><path d="M35 14H185M66 14 69 40 92 54M154 14 151 40 128 54M110 60V91L94 116M110 91 125 116" /><circle cx="110" cy="45" r="11" /></>
      : id === "barbell-bench-press" ? <><path className="exercise-sketch-equipment" d="M38 85H170M50 85V111M157 85V111M79 20H139M80 11V29M138 11V29" /><circle cx="50" cy="65" r="10" /><path d="M62 74H130L153 107H177M84 73 108 53 108 20" /></>
        : id === "bodyweight-squat" ? <><circle cx="115" cy="25" r="11" /><path d="M109 38 92 68 137 89 122 114H151M103 49 138 52H174M92 68 130 81 112 108" /></>
          : id === "seated-cable-row" ? <><path className="exercise-sketch-equipment" d="M35 82H108M45 82V111M190 45V107M145 63H190" /><circle cx="78" cy="26" r="10" /><path d="M78 39V78L122 90 151 105M78 78 120 101H157M80 43 112 69 145 63" /></>
            : <><path d="M48 66H172M48 47V85M37 53V79M172 47V85M183 53V79" /><circle cx="110" cy="66" r="17" /></>;
  return <svg viewBox="0 0 220 130" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="exercise-movement-sketch"><path className="exercise-sketch-equipment" d="M20 120H200" />{scene}</svg>;
}
