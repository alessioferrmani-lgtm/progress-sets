export type WorkoutNavigationRow = {
  completed: boolean;
};

export type WorkoutSetLocation = {
  exerciseIndex: number;
  setIndex: number;
};

/**
 * Finds the next exercise that still has at least one uncompleted set.
 * The current exercise is never returned, so it is safe to use for the
 * explicit "Salta esercizio" action.
 */
export function findNextUncompletedExercise<Row extends WorkoutNavigationRow>(
  exerciseOrder: string[],
  rowsByExercise: Record<string, Row[]>,
  currentExerciseIndex: number,
): WorkoutSetLocation | null {
  if (exerciseOrder.length < 2) return null;

  for (let offset = 1; offset < exerciseOrder.length; offset += 1) {
    const exerciseIndex = (currentExerciseIndex + offset) % exerciseOrder.length;
    const rows = rowsByExercise[exerciseOrder[exerciseIndex]] ?? [];
    const setIndex = rows.findIndex((row) => !row.completed);
    if (setIndex >= 0) return { exerciseIndex, setIndex };
  }

  return null;
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
