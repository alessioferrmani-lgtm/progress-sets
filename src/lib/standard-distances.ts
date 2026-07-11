// Single source of truth for standard athletics distances (in metres).
// Used by Test, Gare and Ripetute modules so every comparison is on the
// exact same distance.
export const STANDARD_DISTANCES = [
  50, 60, 80, 100, 110, 120, 150, 200, 300, 400, 500, 600, 1000, 1500,
] as const;

export type StandardDistance = (typeof STANDARD_DISTANCES)[number];

export function isStandardDistance(m: number): m is StandardDistance {
  return (STANDARD_DISTANCES as readonly number[]).includes(m);
}

export function formatStandardDistance(m: number): string {
  if (m >= 1000) return `${m / 1000}${m % 1000 === 0 ? "" : ""}km`.replace("km", " km");
  return `${m} m`;
}
