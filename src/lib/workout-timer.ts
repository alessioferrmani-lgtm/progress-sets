/** Maximum duration persisted for an open session before it is considered stale. */
export const MAX_WORKOUT_DURATION_SEC = 4 * 60 * 60;

/**
 * Calculates live workout duration from the session start timestamp.
 * A wall-clock anchor keeps the timer correct across reloads and iOS
 * background suspension, while the cap prevents forgotten sessions from
 * accumulating days of duration.
 */
export function getWorkoutElapsedSeconds(startedAt: string, now = Date.now()) {
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started) || !Number.isFinite(now)) return 0;
  return Math.max(
    0,
    Math.min(MAX_WORKOUT_DURATION_SEC, Math.floor((now - started) / 1000)),
  );
}
