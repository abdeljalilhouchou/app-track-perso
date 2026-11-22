/** A set of the session in progress, kept in the browser until the session is saved. */
export type DraftSet = { key: string; reps: number | null; holdSeconds: number | null; mode: "reps" | "hold"; assistanceKg: number | null; addedWeightKg: number | null; variation: string; notes: string; done?: boolean };
/** One exercise of the session in progress. */
export type DraftItem = { key: string; exerciseId: string; sets: DraftSet[]; /** The planned reps or seconds per set, when the exercise comes from a program. */ target?: number | null };
