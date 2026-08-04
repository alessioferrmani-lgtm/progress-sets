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

/** Crea un'attività TCX importabile, conservando le serie nelle note e nelle estensioni. */
export function buildZeppTcx(workout: ZeppExportWorkout) {
  const startedAt = isoDate(workout.startedAt, "Data di inizio");
  const requestedEndedAt = isoDate(workout.endedAt, "Data di fine");
  const startedMs = new Date(startedAt).getTime();
  const endedMs = Math.max(startedMs, new Date(requestedEndedAt).getTime());
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
<TrainingCenterDatabase xmlns="${TCX_NAMESPACE}" xmlns:ps="${PROGRESS_SETS_NAMESPACE}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
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
    <Name>Progress Sets</Name><UnitId>0</UnitId><ProductID>0</ProductID>
    <Version><VersionMajor>1</VersionMajor><VersionMinor>0</VersionMinor><BuildMajor>0</BuildMajor><BuildMinor>0</BuildMinor></Version>
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
  return `progress-sets-${safeName || "allenamento"}-${datePart}.fit`;
}

type FitBaseType = "enum" | "uint8" | "uint16" | "uint32" | "float32" | "string" | "bytes";

type FitField = {
  number: number;
  size: number;
  baseType: FitBaseType;
  developerDataIndex?: number;
};

type FitDefinition = {
  localMessageType: number;
  globalMessageNumber: number;
  fields: FitField[];
  developerFields?: FitField[];
};

const FIT_BASE_TYPE_ID: Record<FitBaseType, number> = {
  enum: 0x00,
  uint8: 0x02,
  uint16: 0x84,
  uint32: 0x86,
  float32: 0x88,
  string: 0x07,
  bytes: 0x0d,
};

const FIT_EPOCH_MS = Date.UTC(1989, 11, 31);
const FIT_DEVELOPER_INDEX = 0;
const FIT_RECORD_MESSAGE = 20;
const FIT_SET_MESSAGE = 225;
const FIT_WORKOUT_MESSAGE = 26;
const FIT_WORKOUT_STEP_MESSAGE = 27;
const FIT_TRAINING_SPORT = 10;
const FIT_STRENGTH_SUBSPORT = 20;
const FIT_REPETITIONS_DURATION = 29;
const FIT_OPEN_TARGET = 2;
const FIT_ACTIVE_INTENSITY = 0;
const FIT_ACTIVE_SET = 1;
const FIT_KILOGRAM_UNIT = 1;

function fitDateTime(value: string, label: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} non valida`);
  return Math.max(0, Math.floor((date.getTime() - FIT_EPOCH_MS) / 1000));
}

function fitU16(value: number) {
  const safe = Math.max(0, Math.min(0xffff, Math.round(value)));
  return [safe & 0xff, (safe >>> 8) & 0xff];
}

function fitU32(value: number) {
  const safe = Math.max(0, Math.min(0xffffffff, Math.round(value)));
  return [safe & 0xff, (safe >>> 8) & 0xff, (safe >>> 16) & 0xff, (safe >>> 24) & 0xff];
}

function fitF32(value: number) {
  const bytes = new ArrayBuffer(4);
  new DataView(bytes).setFloat32(0, Number.isFinite(value) ? value : 0, true);
  return [...new Uint8Array(bytes)];
}

function fitString(value: string, size: number) {
  const bytes = [...new TextEncoder().encode(value)].slice(0, Math.max(0, size - 1));
  return [...bytes, ...new Array(Math.max(0, size - bytes.length)).fill(0)];
}

function fitValue(field: FitField, value: unknown) {
  if (field.baseType === "bytes") {
    const bytes = Array.isArray(value) ? value : [];
    return [
      ...bytes.slice(0, field.size),
      ...new Array(Math.max(0, field.size - bytes.length)).fill(0),
    ];
  }
  if (field.baseType === "string") return fitString(String(value ?? ""), field.size);
  if (field.baseType === "float32") return fitF32(Number(value));
  if (field.baseType === "uint32") return fitU32(Number(value));
  if (field.baseType === "uint16") return fitU16(Number(value));
  return [Math.max(0, Math.min(0xff, Math.round(Number(value) || 0)))];
}

function fitDefinition(definition: FitDefinition) {
  const developerFields = definition.developerFields ?? [];
  const hasDeveloperFields = developerFields.length > 0;
  return [
    0x40 | (hasDeveloperFields ? 0x20 : 0) | definition.localMessageType,
    0,
    0,
    ...fitU16(definition.globalMessageNumber),
    definition.fields.length,
    ...definition.fields.flatMap((field) => [
      field.number,
      field.size,
      field.developerDataIndex == null
        ? FIT_BASE_TYPE_ID[field.baseType]
        : field.developerDataIndex,
    ]),
    ...(hasDeveloperFields
      ? [
          developerFields.length,
          ...developerFields.flatMap((field) => [
            field.number,
            field.size,
            field.developerDataIndex ?? 0,
          ]),
        ]
      : []),
  ];
}

function fitData(definition: FitDefinition, values: Record<string, unknown>) {
  return [
    definition.localMessageType,
    ...[...definition.fields, ...(definition.developerFields ?? [])].flatMap((field) =>
      fitValue(field, values[`${field.developerDataIndex == null ? "fit" : "dev"}${field.number}`]),
    ),
  ];
}

function fitCrc(bytes: number[]) {
  const crcTable = [
    0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401, 0xa001, 0x6c00, 0x7800, 0xb401,
    0x5000, 0x9c01, 0x8801, 0x4400,
  ];
  let crc = 0;
  for (const byte of bytes) {
    let tmp = crcTable[crc & 0xf];
    crc = (crc >>> 4) & 0x0fff;
    crc ^= tmp ^ crcTable[byte & 0xf];
    tmp = crcTable[crc & 0xf];
    crc = (crc >>> 4) & 0x0fff;
    crc ^= tmp ^ crcTable[(byte >>> 4) & 0xf];
  }
  return crc;
}

const FIT_FILE_ID: FitDefinition = {
  localMessageType: 0,
  globalMessageNumber: 0,
  fields: [
    { number: 0, size: 1, baseType: "enum" },
    { number: 1, size: 2, baseType: "uint16" },
    { number: 2, size: 2, baseType: "uint16" },
    { number: 3, size: 4, baseType: "uint32" },
    { number: 4, size: 4, baseType: "uint32" },
  ],
};

const FIT_SESSION: FitDefinition = {
  localMessageType: 1,
  globalMessageNumber: 18,
  fields: [
    { number: 253, size: 4, baseType: "uint32" },
    { number: 0, size: 1, baseType: "enum" },
    { number: 1, size: 1, baseType: "enum" },
    { number: 2, size: 4, baseType: "uint32" },
    { number: 5, size: 1, baseType: "enum" },
    { number: 6, size: 1, baseType: "enum" },
    { number: 7, size: 4, baseType: "uint32" },
    { number: 8, size: 4, baseType: "uint32" },
    { number: 9, size: 4, baseType: "uint32" },
    { number: 11, size: 2, baseType: "uint16" },
    { number: 15, size: 1, baseType: "uint8" },
    { number: 26, size: 2, baseType: "uint16" },
  ],
};

const FIT_DEVELOPER_DATA_ID: FitDefinition = {
  localMessageType: 5,
  globalMessageNumber: 207,
  fields: [
    { number: 0, size: 16, baseType: "bytes" },
    { number: 1, size: 16, baseType: "bytes" },
    { number: 3, size: 1, baseType: "uint8" },
  ],
};

const FIT_FIELD_DESCRIPTION: FitDefinition = {
  localMessageType: 6,
  globalMessageNumber: 206,
  fields: [
    { number: 0, size: 1, baseType: "uint8" },
    { number: 1, size: 1, baseType: "uint8" },
    { number: 2, size: 1, baseType: "uint8" },
    { number: 3, size: 32, baseType: "string" },
    { number: 8, size: 16, baseType: "string" },
    { number: 11, size: 2, baseType: "uint16" },
    { number: 12, size: 1, baseType: "uint8" },
  ],
};

const FIT_LAP: FitDefinition = {
  localMessageType: 2,
  globalMessageNumber: 19,
  fields: [
    { number: 253, size: 4, baseType: "uint32" },
    { number: 0, size: 1, baseType: "enum" },
    { number: 1, size: 1, baseType: "enum" },
    { number: 2, size: 4, baseType: "uint32" },
    { number: 7, size: 4, baseType: "uint32" },
    { number: 8, size: 4, baseType: "uint32" },
    { number: 9, size: 4, baseType: "uint32" },
    { number: 11, size: 2, baseType: "uint16" },
    { number: 15, size: 1, baseType: "uint8" },
  ],
};

const FIT_WORKOUT: FitDefinition = {
  localMessageType: 8,
  globalMessageNumber: FIT_WORKOUT_MESSAGE,
  fields: [
    { number: 4, size: 1, baseType: "enum" },
    { number: 5, size: 4, baseType: "uint32" },
    { number: 6, size: 2, baseType: "uint16" },
    { number: 8, size: 64, baseType: "string" },
    { number: 11, size: 1, baseType: "enum" },
  ],
};

const FIT_WORKOUT_STEP: FitDefinition = {
  localMessageType: 9,
  globalMessageNumber: FIT_WORKOUT_STEP_MESSAGE,
  fields: [
    { number: 0, size: 64, baseType: "string" },
    { number: 1, size: 1, baseType: "enum" },
    { number: 2, size: 4, baseType: "uint32" },
    { number: 3, size: 1, baseType: "enum" },
    { number: 7, size: 1, baseType: "enum" },
    { number: 12, size: 2, baseType: "uint16" },
    { number: 13, size: 2, baseType: "uint16" },
    { number: 254, size: 2, baseType: "uint16" },
  ],
};

const FIT_SET: FitDefinition = {
  localMessageType: 7,
  globalMessageNumber: FIT_SET_MESSAGE,
  fields: [
    { number: 3, size: 2, baseType: "uint16" },
    { number: 4, size: 2, baseType: "uint16" },
    { number: 5, size: 1, baseType: "uint8" },
    { number: 6, size: 4, baseType: "uint32" },
    { number: 10, size: 2, baseType: "uint16" },
    { number: 11, size: 2, baseType: "uint16" },
    { number: 254, size: 4, baseType: "uint32" },
  ],
};

const FIT_RECORD: FitDefinition = {
  localMessageType: 3,
  globalMessageNumber: FIT_RECORD_MESSAGE,
  fields: [{ number: 253, size: 4, baseType: "uint32" }],
  developerFields: [
    { number: 0, size: 64, baseType: "string", developerDataIndex: FIT_DEVELOPER_INDEX },
    { number: 1, size: 1, baseType: "uint8", developerDataIndex: FIT_DEVELOPER_INDEX },
    { number: 2, size: 4, baseType: "float32", developerDataIndex: FIT_DEVELOPER_INDEX },
    { number: 3, size: 2, baseType: "uint16", developerDataIndex: FIT_DEVELOPER_INDEX },
    { number: 4, size: 2, baseType: "uint16", developerDataIndex: FIT_DEVELOPER_INDEX },
    { number: 5, size: 2, baseType: "uint16", developerDataIndex: FIT_DEVELOPER_INDEX },
  ],
};

const FIT_ACTIVITY: FitDefinition = {
  localMessageType: 4,
  globalMessageNumber: 34,
  fields: [
    { number: 253, size: 4, baseType: "uint32" },
    { number: 0, size: 4, baseType: "uint32" },
    { number: 1, size: 2, baseType: "uint16" },
    { number: 2, size: 1, baseType: "enum" },
    { number: 3, size: 1, baseType: "enum" },
    { number: 4, size: 1, baseType: "enum" },
  ],
};

/** Crea un FIT Activity valido con metadati strength e serie standard + developer fields. */
export function buildZeppFit(workout: ZeppExportWorkout) {
  const startedAt = fitDateTime(workout.startedAt, "Data di inizio");
  const endedAt = fitDateTime(workout.endedAt, "Data di fine");
  const sets = workout.sets.map((set) => ({
    ...set,
    completedAt: fitDateTime(set.completedAt, "Data serie"),
  }));
  const endTime = Math.max(startedAt, endedAt);
  const elapsedMs = Math.max(0, (endTime - startedAt) * 1000);
  const calories = workout.calories == null ? 0 : integer(workout.calories);
  const avgHr = workout.avgHr == null ? 0 : integer(workout.avgHr);
  const records: number[] = [];
  const append = (bytes: number[]) => records.push(...bytes);
  append(fitDefinition(FIT_FILE_ID));
  append(
    fitData(FIT_FILE_ID, {
      fit0: 4,
      fit1: 1,
      fit2: 1,
      fit3: 0x50534554,
      fit4: startedAt,
    }),
  );
  append(fitDefinition(FIT_SESSION));
  append(
    fitData(FIT_SESSION, {
      fit253: endTime,
      fit0: 0,
      fit1: 1,
      fit2: startedAt,
      fit5: FIT_TRAINING_SPORT,
      fit6: FIT_STRENGTH_SUBSPORT,
      fit7: elapsedMs,
      fit8: elapsedMs,
      fit9: 0,
      fit11: calories,
      fit15: avgHr,
      fit26: 1,
    }),
  );
  append(fitDefinition(FIT_LAP));
  append(
    fitData(FIT_LAP, {
      fit253: endTime,
      fit0: 0,
      fit1: 1,
      fit2: startedAt,
      fit7: elapsedMs,
      fit8: elapsedMs,
      fit9: 0,
      fit11: calories,
      fit15: avgHr,
    }),
  );
  if (sets.length > 0) {
    append(fitDefinition(FIT_WORKOUT));
    append(
      fitData(FIT_WORKOUT, {
        fit4: FIT_TRAINING_SPORT,
        fit5: 2,
        fit6: sets.length,
        fit8: workout.name,
        fit11: FIT_STRENGTH_SUBSPORT,
      }),
    );
    append(fitDefinition(FIT_WORKOUT_STEP));
    sets.forEach((set, index) => {
      append(
        fitData(FIT_WORKOUT_STEP, {
          fit0: set.exerciseName,
          fit1: FIT_REPETITIONS_DURATION,
          fit2: integer(set.reps),
          fit3: FIT_OPEN_TARGET,
          fit7: FIT_ACTIVE_INTENSITY,
          fit12: Math.max(0, Math.round(set.weightKg * 100)),
          fit13: FIT_KILOGRAM_UNIT,
          fit254: index,
        }),
      );
    });
  }
  const developerId = [
    0x50, 0x52, 0x4f, 0x47, 0x52, 0x45, 0x53, 0x53, 0x2d, 0x53, 0x45, 0x54, 0, 0, 0, 1,
  ];
  const applicationId = [
    0x50, 0x72, 0x6f, 0x67, 0x72, 0x65, 0x73, 0x73, 0x20, 0x53, 0x65, 0x74, 0x73, 0, 0, 1,
  ];
  append(fitDefinition(FIT_DEVELOPER_DATA_ID));
  append(
    fitData(FIT_DEVELOPER_DATA_ID, {
      fit0: developerId,
      fit1: applicationId,
      fit3: FIT_DEVELOPER_INDEX,
    }),
  );
  const developerDescriptions: Array<[number, FitBaseType, string, string]> = [
    [0, "string", "exercise_name", "text"],
    [1, "uint8", "set_number", "count"],
    [2, "float32", "weight_kg", "kg"],
    [3, "uint16", "repetitions", "repetitions"],
    [4, "uint16", "rest_seconds", "s"],
    [5, "uint16", "exercise_set_number", "count"],
  ];
  append(fitDefinition(FIT_FIELD_DESCRIPTION));
  developerDescriptions.forEach(([fieldNumber, baseType, fieldName, units]) => {
    append(
      fitData(FIT_FIELD_DESCRIPTION, {
        fit0: FIT_DEVELOPER_INDEX,
        fit1: fieldNumber,
        fit2: FIT_BASE_TYPE_ID[baseType],
        fit3: fieldName,
        fit8: units,
        fit11: FIT_RECORD_MESSAGE,
        fit12: fieldNumber,
      }),
    );
  });
  append(fitDefinition(FIT_RECORD));
  sets.forEach((set) => {
    append(
      fitData(FIT_RECORD, {
        fit253: set.completedAt,
        dev0: set.exerciseName,
        dev1: set.setNumber,
        dev2: set.weightKg,
        dev3: set.reps,
        dev4: set.restTakenSec ?? 0,
        dev5: set.setNumber,
      }),
    );
  });
  append(fitDefinition(FIT_SET));
  sets.forEach((set, index) => {
    append(
      fitData(FIT_SET, {
        fit3: integer(set.reps),
        fit4: Math.max(0, Math.round(set.weightKg * 16)),
        fit5: FIT_ACTIVE_SET,
        fit6: set.completedAt,
        fit10: index,
        fit11: index,
        fit254: set.completedAt,
      }),
    );
  });
  append(fitDefinition(FIT_ACTIVITY));
  append(
    fitData(FIT_ACTIVITY, {
      fit253: endTime,
      fit0: elapsedMs,
      fit1: 1,
      fit2: 0,
      fit3: 0,
      fit4: 1,
    }),
  );

  // 14-byte FIT header; profile version 21.40 is the current public profile.
  const header = [14, 0x20, 0x28, 0x15, ...fitU32(records.length), 0x2e, 0x46, 0x49, 0x54, 0, 0];
  const all = [...header, ...records];
  const crc = fitCrc(all);
  return new Uint8Array([...all, ...fitU16(crc)]);
}
