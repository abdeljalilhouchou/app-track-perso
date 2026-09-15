"use client";

const MOODS = [
  { value: 1, emoji: "😞" },
  { value: 2, emoji: "😕" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "🙂" },
  { value: 5, emoji: "😄" },
];

export function MoodPicker({ defaultValue = 3 }: { defaultValue?: number }) {
  return (
    <div className="flex gap-2">
      {MOODS.map((m) => (
        <label key={m.value} className="cursor-pointer">
          <input
            type="radio"
            name="mood_score"
            value={m.value}
            defaultChecked={m.value === defaultValue}
            className="peer sr-only"
          />
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border text-2xl transition peer-checked:border-mood peer-checked:bg-mood-soft peer-checked:scale-110">
            {m.emoji}
          </span>
        </label>
      ))}
    </div>
  );
}
