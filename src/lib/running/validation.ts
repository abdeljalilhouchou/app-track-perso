import { isFiniteInRange, isUuid, isValidIsoDate } from "@/lib/actions/validation";
import { RUN_TYPES, type RunType } from "./stats";

export type RunningSessionInput = {
  workoutId?: unknown;
  date: unknown;
  name?: unknown;
  runType: unknown;
  distanceKm: unknown;
  durationSeconds: unknown;
  intensity: unknown;
  notes?: unknown;
  elevationGainM?: unknown;
  averageHeartRate?: unknown;
  cadenceSpm?: unknown;
};

export type ValidatedRunningSession = {
  workoutId: string | null;
  date: string;
  name: string;
  runType: RunType;
  distanceKm: number;
  durationSeconds: number;
  intensity: number;
  notes: string;
  elevationGainM: number | null;
  averageHeartRate: number | null;
  cadenceSpm: number | null;
};

function optionalInteger(value: unknown, min: number, max: number): number | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  return isFiniteInRange(value, min, max, true) ? value : undefined;
}

/** Validate untrusted server-action input and normalize all optional values to null. */
export function validateRunningSessionInput(input: RunningSessionInput, today = new Date().toISOString().slice(0, 10)): ValidatedRunningSession | null {
  const workoutId = input.workoutId === null || input.workoutId === undefined || input.workoutId === "" ? null : input.workoutId;
  const name = input.name === null || input.name === undefined ? "" : typeof input.name === "string" ? input.name.trim() : null;
  const notes = input.notes === null || input.notes === undefined ? "" : typeof input.notes === "string" ? input.notes.trim() : null;
  const elevationGainM = optionalInteger(input.elevationGainM, 0, 100000);
  const averageHeartRate = optionalInteger(input.averageHeartRate, 30, 250);
  const cadenceSpm = optionalInteger(input.cadenceSpm, 1, 300);
  const distance = input.distanceKm;
  const duration = input.durationSeconds;
  const intensity = input.intensity;

  if ((workoutId !== null && !isUuid(workoutId)) || !isValidIsoDate(input.date) || input.date > today ||
    name === null || name.length > 100 || notes === null || notes.length > 2000 ||
    typeof input.runType !== "string" || !RUN_TYPES.includes(input.runType as RunType) ||
    !isFiniteInRange(distance, 0.001, 1000) || Math.abs(distance * 1000 - Math.round(distance * 1000)) >= 1e-7 ||
    !isFiniteInRange(duration, 1, 604800, true) || !isFiniteInRange(intensity, 1, 5, true) ||
    elevationGainM === undefined || averageHeartRate === undefined || cadenceSpm === undefined) return null;

  return {
    workoutId,
    date: input.date,
    name,
    runType: input.runType as RunType,
    distanceKm: distance,
    durationSeconds: duration,
    intensity,
    notes,
    elevationGainM,
    averageHeartRate,
    cadenceSpm,
  };
}
