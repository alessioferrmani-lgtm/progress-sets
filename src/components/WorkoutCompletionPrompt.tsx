import { CheckCircle2, Play } from "lucide-react";

type WorkoutCompletionPromptProps = {
  onContinue: () => void;
  onFinish: () => void;
  isFinishing?: boolean;
};

/** iOS-style confirmation shown after the final set is saved. */
export function WorkoutCompletionPrompt({
  onContinue,
  onFinish,
  isFinishing = false,
}: WorkoutCompletionPromptProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/45" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="workout-completion-title"
        className="w-full rounded-t-[28px] bg-background px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4 shadow-2xl"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-separator" />
        <div className="flex size-12 items-center justify-center rounded-2xl bg-success/15 text-success">
          <CheckCircle2 className="size-6" />
        </div>
        <h2 id="workout-completion-title" className="mt-4 text-xl font-bold text-label">
          Allenamento completato
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-label-secondary">
          Hai completato tutte le serie. Vuoi terminare e salvare l&apos;allenamento?
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isFinishing}
            onClick={onContinue}
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-fill px-4 font-semibold text-label disabled:opacity-50"
          >
            <Play className="size-5" /> Continua
          </button>
          <button
            type="button"
            disabled={isFinishing}
            onClick={onFinish}
            className="min-h-12 rounded-full bg-accent px-4 font-semibold text-accent-foreground disabled:opacity-50"
          >
            {isFinishing ? "Salvataggio…" : "Termina allenamento"}
          </button>
        </div>
      </section>
    </div>
  );
}
