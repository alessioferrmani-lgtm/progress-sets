/** Format a session's lifted volume without duplicating the unit suffix. */
export function formatVolumeKg(volume: number): string {
  const safeVolume = Number.isFinite(volume) ? Math.max(0, volume) : 0;
  return safeVolume >= 1000
    ? `${(safeVolume / 1000).toFixed(1)}k kg`
    : `${Math.round(safeVolume)} kg`;
}
