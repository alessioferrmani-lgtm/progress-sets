export type WorkoutNavigationRow = {
  completed: boolean;
};

export type WorkoutSetLocation = {
  exerciseIndex: number;
  setIndex: number;
};

export type GroupedExercise = { id: string; superset_group?: string | null };

/** A block owns its children; ordinary exercises remain single-child blocks. */
export function workoutBlocks(exercises: GroupedExercise[]): number[][] {
  const blocks: number[][] = [];
  exercises.forEach((exercise, index) => {
    const group = exercise.superset_group?.trim();
    const existing = group ? blocks.find(block => exercises[block[0]].superset_group?.trim() === group) : undefined;
    if (existing) existing.push(index);
    else blocks.push([index]);
  });
  return blocks;
}

/** Round-major order inside a superset: A1 B1 A2 B2, without losing saved rows. */
export function nextGroupedSet<Row extends WorkoutNavigationRow>(
  exercises: GroupedExercise[], rows: Record<string, Row[]>, current: WorkoutSetLocation,
): { next: WorkoutSetLocation | null; rest: boolean } {
  const blocks = workoutBlocks(exercises);
  const positions = blocks.flatMap((block, blockIndex) => {
    const count = Math.max(0, ...block.map(i => rows[exercises[i].id]?.length ?? 0));
    return Array.from({length: count}, (_, setIndex) => block.flatMap(exerciseIndex =>
      rows[exercises[exerciseIndex].id]?.[setIndex] ? [{exerciseIndex, setIndex, blockIndex}] : [],
    )).flat();
  });
  const index = positions.findIndex(p => p.exerciseIndex === current.exerciseIndex && p.setIndex === current.setIndex);
  if (index < 0) return {next: null, rest: false};
  for (let offset = 1; offset < positions.length; offset++) {
    const candidate = positions[(index + offset) % positions.length];
    if (!rows[exercises[candidate.exerciseIndex].id][candidate.setIndex].completed) {
      const sameRound = candidate.blockIndex === positions[index].blockIndex && candidate.setIndex === current.setIndex;
      return {next: {exerciseIndex: candidate.exerciseIndex, setIndex: candidate.setIndex}, rest: !sameRound};
    }
  }
  return {next: null, rest: false};
}

/**
 * Finds the next uncompleted set in workout order, wrapping around only when
 * an earlier set was skipped manually. The current set is never returned.
 */
export function findNextUncompletedSet<Row extends WorkoutNavigationRow>(
  exerciseOrder: string[],
  rowsByExercise: Record<string, Row[]>,
  current: WorkoutSetLocation,
): WorkoutSetLocation | null {
  const positions = exerciseOrder.flatMap((exerciseId, exerciseIndex) =>
    (rowsByExercise[exerciseId] ?? []).map((_, setIndex) => ({ exerciseIndex, setIndex })),
  );
  const currentPosition = positions.findIndex(
    (position) =>
      position.exerciseIndex === current.exerciseIndex && position.setIndex === current.setIndex,
  );
  if (currentPosition < 0 || positions.length < 2) return null;

  for (let offset = 1; offset < positions.length; offset += 1) {
    const position = positions[(currentPosition + offset) % positions.length];
    const exerciseId = exerciseOrder[position.exerciseIndex];
    const row = rowsByExercise[exerciseId]?.[position.setIndex];
    if (row && !row.completed) return position;
  }

  return null;
}

/**
 * Finds the next set using the state that exists immediately after the
 * current set is confirmed. React state updates are asynchronous, so callers
 * must not ask `findNextUncompletedSet` with the pre-confirmation snapshot or
 * it can return the same set again.
 */
export function findNextAfterCompletion<Row extends WorkoutNavigationRow>(
  exerciseOrder: string[],
  rowsByExercise: Record<string, Row[]>,
  current: WorkoutSetLocation,
): WorkoutSetLocation | null {
  const exerciseId = exerciseOrder[current.exerciseIndex];
  const rows = exerciseId ? rowsByExercise[exerciseId] : undefined;
  if (!rows?.[current.setIndex]) return null;

  const completedRows = rows.map((row, index) =>
    index === current.setIndex ? { ...row, completed: true } : row,
  );
  return findNextUncompletedSet(
    exerciseOrder,
    { ...rowsByExercise, [exerciseId]: completedRows },
    current,
  );
}
