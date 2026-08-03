export type ZeppExportSet = {
  exerciseName: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  completedAt: string;
  restTakenSec: number | null;
};

export type ZeppExportWorkout = {
  name: string;
  startedAt: string;
  endedAt: string;
  calories: number | null;
  avgHr: number | null;
  sets: ZeppExportSet[];
};

const TCX_NAMESPACE = "http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2";
const TCX_ACTIVITY_EXTENSION_NAMESPACE = "http://www.garmin.com/xmlschemas/ActivityExtension/v2";
const PROGRESS_SETS_NAMESPACE = "https://progress-sets.app/tcx/strength";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function isoDate(value: string, label: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} non valida`);
  return date.toISOString();
}

function integer(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function decimal(value: number) {
  return Number.isFinite(value) ? Math.max(0, value).toFixed(2) : "0.00";
}

/**
 * Builds a Training Center XML activity. Zepp documents TCX as an importable
 * activity format; strength-specific fields are kept in a namespaced extension
 * and in the lap notes so the workout is still useful when a device ignores
 * custom strength fields.
 */
export function buildZeppTcx(workout: ZeppExportWorkout) {
  const startedAt = isoDate(workout.startedAt, "Data di inizio");
  const requestedEndedAt = isoDate(workout.endedAt, "Data di fine");
  const startedMs = new Date(startedAt).getTime();
  const endedMs = Math.max(startedMs, new Date(requestedEndedAt).getTime());
  const endedAt = new Date(endedMs).toISOString();
  const totalTimeSeconds = Math.max(0, Math.round((endedMs - startedMs) / 1000));
  const sets = workout.sets.map((set) => ({
    ...set,
    completedAt: isoDate(set.completedAt, "Data serie"),
  }));
  const notes = [
    `Progress Sets - ${workout.name}`,
    "Serie registrate:",
    ...sets.map(
      (set, index) =>
        `${index + 1}. ${set.exerciseName} · S${set.setNumber} · ${decimal(set.weightKg)} kg · ${integer(set.reps)} rip.`,
    ),
  ].join("\n");

  const calories =
    workout.calories == null || !Number.isFinite(workout.calories)
      ? ""
      : `\n        <Calories>${integer(workout.calories)}</Calories>`;
  const averageHeartRate =
    workout.avgHr == null || !Number.isFinite(workout.avgHr)
      ? ""
      : `\n        <AverageHeartRateBpm><Value>${integer(workout.avgHr)}</Value></AverageHeartRateBpm>`;

  const trackpoints = sets
    .map(
      (set) => `
          <Trackpoint>
            <Time>${set.completedAt}</Time>
            <DistanceMeters>0</DistanceMeters>
            <Extensions>
              <ps:StrengthSet>
                <ps:Exercise>${escapeXml(set.exerciseName)}</ps:Exercise>
                <ps:SetNumber>${integer(set.setNumber)}</ps:SetNumber>
                <ps:WeightKg>${decimal(set.weightKg)}</ps:WeightKg>
                <ps:Repetitions>${integer(set.reps)}</ps:Repetitions>
                <ps:RestSeconds>${set.restTakenSec == null ? "" : integer(set.restTakenSec)}</ps:RestSeconds>
              </ps:StrengthSet>
            </Extensions>
          </Trackpoint>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase
  xmlns="${TCX_NAMESPACE}"
  xmlns:ae="${TCX_ACTIVITY_EXTENSION_NAMESPACE}"
  xmlns:ps="${PROGRESS_SETS_NAMESPACE}"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Activities>
    <Activity Sport="Other">
      <Id>${startedAt}</Id>
      <Lap StartTime="${startedAt}">
        <TotalTimeSeconds>${totalTimeSeconds}</TotalTimeSeconds>
        <DistanceMeters>0</DistanceMeters>${calories}${averageHeartRate}
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>
        <Notes>${escapeXml(notes)}</Notes>
        <Track>${trackpoints}
        </Track>
      </Lap>
    </Activity>
  </Activities>
  <Author xsi:type="Device_t">
    <Name>Progress Sets</Name>
    <UnitId>0</UnitId>
    <ProductID>0</ProductID>
    <Version>
      <VersionMajor>1</VersionMajor>
      <VersionMinor>0</VersionMinor>
      <BuildMajor>0</BuildMajor>
      <BuildMinor>0</BuildMinor>
    </Version>
  </Author>
</TrainingCenterDatabase>
`;
}

export function zeppFilename(name: string, startedAt: string) {
  const date = new Date(startedAt);
  const datePart = Number.isNaN(date.getTime()) ? "allenamento" : date.toISOString().slice(0, 10);
  const safeName = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `progress-sets-${safeName || "allenamento"}-${datePart}.tcx`;
}
