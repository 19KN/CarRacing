/** Large weight so checkpoint laps always beat raw distance along the track */
export const CHECKPOINT_PROGRESS_WEIGHT = 1_000_000;

/** Higher value = further ahead on the race track */
export function computeRaceProgress(spawnZ: number, positionZ: number, checkpointIndex: number): number {
  return checkpointIndex * CHECKPOINT_PROGRESS_WEIGHT + (spawnZ - positionZ);
}
