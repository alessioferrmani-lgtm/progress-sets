export type EditableWorkoutRow = {
  weight: string;
  completed: boolean;
};

export function updateWeightAndPropagate<T extends EditableWorkoutRow>(
  rows: T[],
  rowIndex: number,
  weight: string,
): T[] {
  return rows.map((row, index) => {
    if (index === rowIndex) return { ...row, weight };
    if (rowIndex === 0 && index > rowIndex && !row.completed) return { ...row, weight };
    return row;
  });
}
