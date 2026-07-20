import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { loadProgressExportJson } from "@/lib/progress-json-export";

export const Route = createFileRoute("/_authenticated/profile/export")({
  component: CompleteTextExportPage,
});

function CompleteTextExportPage() {
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReport(await loadProgressExportJson());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossibile caricare i dati salvati");
      setReport("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(report);
      toast.success("Tutti i dati sono stati copiati");
    } catch {
      const field = textRef.current;
      if (field) {
        field.focus();
        field.select();
        field.setSelectionRange(0, field.value.length);
      }
      toast.info("Testo selezionato: scegli Copia dal menu del telefono");
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-28 pt-[calc(env(safe-area-inset-top)+16px)]">
      <Link to="/profile" className="inline-flex items-center gap-1 py-2 text-sm text-accent">
        <ArrowLeft className="size-4" /> Profilo
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-label">Esporta dati</h1>
      <p className="mt-1 text-sm leading-relaxed text-label-secondary">
        Qui trovi tutto ciò che hai salvato in formato JSON strutturato: profilo e peso, schede e
        allenamenti palestra, ripetute, test, gare e record. Copialo e incollalo nella chat per
        creare PDF, grafici e analisi senza perdere dettagli.
      </p>

      {loading ? (
        <div className="ios-card mt-6 animate-pulse p-8 text-center text-sm text-label-secondary">
          Caricamento di tutti i dati salvati…
        </div>
      ) : error ? (
        <div className="ios-card mt-6 p-5">
          <p className="text-sm text-danger">{error}</p>
          <button
            type="button"
            onClick={loadReport}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-fill px-4 py-2 text-sm font-semibold text-accent"
          >
            <RefreshCw className="size-4" /> Riprova
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={copyAll}
            className="sticky top-[calc(env(safe-area-inset-top)+8px)] z-10 mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-base font-semibold text-accent-foreground shadow-lg active:scale-[0.98]"
          >
            <Copy className="size-4" /> Copia tutto
          </button>
          <textarea
            ref={textRef}
            readOnly
            aria-label="Tutti i dati salvati in formato JSON"
            value={report}
            className="mt-4 min-h-[72vh] w-full resize-none rounded-2xl border border-separator bg-fill p-4 font-mono text-xs leading-relaxed text-label outline-none"
          />
        </>
      )}
    </main>
  );
}
