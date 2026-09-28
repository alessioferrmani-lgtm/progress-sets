import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile/import")({ component: ImportPage });
type Report = {
  counts: Record<string, number>;
  skippedEmpty: number;
  duplicateSets: number;
  warnings: string[];
  alreadyImported: boolean;
};
function ImportPage() {
  const [text, setText] = useState("");
  const [skipEmpty, setSkipEmpty] = useState(true);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const qc = useQueryClient();
  const reset = () => {
    setReport(null);
    setDone(false);
    setError("");
  };
  const submit = async (preview: boolean) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (new TextEncoder().encode(text).length > 950_000)
        throw new Error("Il file è troppo grande per questa importazione");
      let backup: unknown;
      try {
        backup = JSON.parse(text);
      } catch {
        throw new Error("Incolla il JSON completo esportato dalla vecchia app");
      }
      const response = await fetch("/api/sites/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Progress-Sets": "1" },
        body: JSON.stringify({ backup, skipEmpty, preview }),
      });
      const result = await response.json();
      if (!response.ok || result.error)
        throw new Error(
          result.error?.message ?? "Importazione non disponibile. Nessun dato confermato",
        );
      setReport(result.data);
      if (!preview || result.data.alreadyImported) {
        setDone(true);
        setText("");
        await qc.invalidateQueries();
        toast.success(
          result.data.alreadyImported
            ? "Questo backup era già stato importato"
            : "Dati importati su Sites",
        );
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Importazione non riuscita");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-28 pt-[calc(env(safe-area-inset-top)+16px)]">
      <Link to="/profile" className="inline-flex items-center gap-1 py-2 text-sm text-accent">
        <ArrowLeft className="size-4" /> Profilo
      </Link>
      <h1 className="mt-2 text-3xl font-bold text-label">Importa dati</h1>
      <p className="mt-2 text-base text-label-secondary">
        Copia il JSON da Profilo → Esporta dati della vecchia app. Verrà salvato nel tuo account su
        Sites, senza cancellare i dati esistenti.
      </p>
      {!done && (
        <>
          <input
            ref={file}
            type="file"
            accept=".json,application/json"
            className="hidden"
            aria-label="File backup JSON"
            disabled={busy}
            onChange={async (e) => {
              const selected = e.target.files?.[0];
              if (!selected) return;
              reset();
              if (selected.size > 950_000) {
                setError("Il file è troppo grande");
                return;
              }
              try {
                setText(await selected.text());
              } catch {
                setError("Impossibile leggere il file");
              }
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => file.current?.click()}
            className="mt-5 flex items-center gap-2 rounded-full bg-fill px-4 py-3 font-semibold text-accent"
          >
            <Upload className="size-4" /> Scegli file JSON
          </button>
          <textarea
            value={text}
            disabled={busy}
            onChange={(e) => {
              setText(e.target.value);
              reset();
            }}
            aria-label="Backup JSON da importare"
            placeholder="Oppure incolla qui il backup JSON completo"
            className="mt-4 min-h-48 w-full rounded-2xl border border-separator bg-fill p-4 font-mono text-sm text-label"
          />
          <label className="mt-4 flex items-center gap-3 text-sm text-label">
            <input
              type="checkbox"
              checked={skipEmpty}
              disabled={busy}
              onChange={(e) => {
                setSkipEmpty(e.target.checked);
                reset();
              }}
            />{" "}
            Non copiare gli allenamenti conclusi senza serie
          </label>
          <button
            type="button"
            disabled={busy || !text.trim()}
            onClick={() => void submit(true)}
            className="ios-btn-primary mt-5 w-full disabled:opacity-50"
          >
            {busy ? "Controllo in corso…" : "Controlla backup"}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-danger/40 p-4 text-sm text-danger">
          {error}
        </p>
      )}
      {report && (
        <section className="ios-card mt-5 p-5" aria-label="Riepilogo importazione">
          <h2 className="text-xl font-semibold text-label">
            {done ? "Dati salvati su Sites" : "Anteprima importazione"}
          </h2>
          <p className="mt-3 text-base text-label">
            {report.counts.workout_templates} schede · {report.counts.workout_sessions} allenamenti
            · {report.counts.logged_sets} serie
          </p>
          <p className="mt-2 text-sm text-label-secondary">
            {report.counts.training_programs} programmi · {report.counts.weight_logs} misurazioni
            del peso · {report.counts.tests} test · {report.counts.races} gare ·{" "}
            {report.counts.interval_sessions} sessioni di ripetute
          </p>
          {report.warnings.map((warning, i) => (
            <p key={i} className="mt-3 text-sm text-label-secondary">
              {warning}
            </p>
          ))}
          <p className="mt-3 text-sm text-label-secondary">
            I dati già presenti non vengono sovrascritti. Le calorie e le date restano quelle del
            backup. Le prestazioni vengono ricostruite da test, gare e ripetute.
          </p>
          {!done ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit(false)}
              className="ios-btn-primary mt-5 w-full disabled:opacity-50"
            >
              <Check className="size-4" /> {busy ? "Importazione…" : "Conferma importazione"}
            </button>
          ) : (
            <Link to="/home" className="ios-btn-primary mt-5 w-full">
              Vai alla Home
            </Link>
          )}
        </section>
      )}
    </main>
  );
}
