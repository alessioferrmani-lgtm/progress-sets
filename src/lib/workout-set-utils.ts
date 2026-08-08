export type EditableWorkoutRow = {
  weight: string;
  reps?: string;
  completed: boolean;
};

/**
 * Updates a set field and mirrors the value from the first set to all later
 * sets that are still editable. Completed sets are never changed.
 *
 * Loads are not the only value that should be carried forward: when a user
 * enters the repetitions on the first set, the remaining empty sets should
 * start with the same target while still allowing each set to be corrected
 * independently afterwards.
 */
export function updateSetFieldAndPropagate<T extends EditableWorkoutRow>(
  rows: T[],
  rowIndex: number,
  field: "weight" | "reps",
  value: string,
): T[] {
  return rows.map((row, index) => {
    if (index === rowIndex) return { ...row, [field]: value };
    if (rowIndex === 0 && index > rowIndex && !row.completed) {
      return { ...row, [field]: value };
    }
    return row;
  });
}

export function updateWeightAndPropagate<T extends EditableWorkoutRow>(
  rows: T[],
  rowIndex: number,
  weight: string,
): T[] {
  return updateSetFieldAndPropagate(rows, rowIndex, "weight", weight);
}
