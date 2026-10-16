import { useState, type ReactNode } from "react";
import { BottomSheet } from "./BottomSheet";
export function WorkoutExercisePicker({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-xl bg-fill px-3 text-sm font-semibold text-accent"
      >
        Elenco esercizi
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Scegli esercizio">
        <div
          className="workout-picker-list grid gap-2"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("button")) setOpen(false);
          }}
        >
          {children}
        </div>
      </BottomSheet>
    </>
  );
}
