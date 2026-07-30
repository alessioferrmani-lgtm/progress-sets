export type ExerciseCategoryInput = {
  name: string;
  category?: string | null;
};

/** Running drills belong to Atletica, not to the strength-workout picker. */
export function isAthleticsExercise(exercise: ExerciseCategoryInput): boolean {
  const category = exercise.category?.trim().toLocaleLowerCase("it");
  return category === "corsa" || category === "riscaldamento";
}

export function isGymExercise(exercise: ExerciseCategoryInput): boolean {
  return !isAthleticsExercise(exercise);
}
