export type WorkoutNavigationRow = {
  completed: boolean;
};

export type WorkoutSetLocation = {
  exerciseIndex: number;
  setIndex: number;
};

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
