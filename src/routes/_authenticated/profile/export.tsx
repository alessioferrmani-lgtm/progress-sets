import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Share2,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import {
  deliverExportFile,
  prepareExcelExport,
  preparePDFExport,
  prepareTextExport,
  type ExportPeriod,
  type PreparedExport,
} from "@/lib/export-progress";

export const Route = createFileRoute("/_authenticated/profile/export")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: search.view === "text" ? ("text" as const) : undefined,
    period: isExportPeriod(search.period) ? search.period : ("all" as ExportPeriod),
  }),
  component: ExportPage,
});

function isExportPeriod(value: unknown): value is ExportPeriod {
  return value === "1m" || value === "3m" || value === "1y" || value === "all";
}

const PERIODS: Array<{ id: ExportPeriod; label: string }> = [
  { id: "1m", label: "Ultimo mese" },
  { id: "3m", label: "Ultimi 3 mesi" },
  { id: "1y", label: "Ultimo anno" },
  { id: "all", label: "Da sempre" },
];

function ExportPage() {
  const search = Route.useSearch();
  const [format, setFormat] = useState<"pdf" | "xlsx" | "txt">("txt");
  const [period, setPeriod] = useState<ExportPeriod>("all");
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<PreparedExport | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!prepared) {
      setFileUrl(null);
      return;
    }
    const url = URL.createObjectURL(prepared.file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [prepared]);

  const prepare = async () => {
    setBusy(true);
    setPrepared(null);
    try {
      const result =
        format === "xlsx"
          ? await prepareExcelExport(period)
          : format === "pdf"
            ? await preparePDFExport(period)
            : await prepareTextExport(period);
      if (result.empty) {
        toast.error("Nessun dato nel periodo selezionato");
      } else {
        setPrepared(result.prepared ?? null);
        toast.success("Riepilogo pronto");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore durante l'esportazione");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!prepared) return;
    try {
      const result = await deliverExportFile(prepared);
      if (result === "shared") toast.success("Riepilogo condiviso");
      else if (result === "opened") toast.success("Riepilogo aperto: usa Condividi per salvarlo");
      else toast.success("Riepilogo scaricato");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossibile salvare il riepilogo");
    }
  };

  const copyText = async () => {
    if (!prepared || prepared.format !== "txt") return;
    try {
      await navigator.clipboard.writeText(await prepared.file.text());
      toast.success("Testo copiato: ora puoi incollarlo nella chat");
    } catch {
      toast.error("Apri il file di testo e seleziona Copia tutto");
    }
  };

  if (search.view === "text") return <TextExportView period={search.period} />;

  return (
    <div className="mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
      <Link to="/profile" className="mb-2 inline-flex items-center gap-1 text-sm text-accent">
        <ArrowLeft className="h-4 w-4" /> Profilo
      </Link>
      <h1 className="text-2xl font-bold text-label">Esporta i miei progressi</h1>
      <p className="mt-1 text-sm text-label-secondary">
        Scarica un archivio con allenamenti, test, gare e record personali.
      </p>

      <section className="mt-6">
        <h2 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-label-secondary">
          Formato
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setFormat("txt");
              setPrepared(null);
            }}
            className={
              "ios-card flex flex-col items-center gap-2 p-4 transition-colors " +
              (format === "txt" ? "ring-2 ring-accent" : "")
            }
          >
            <Copy className="h-6 w-6 text-accent" />
            <span className="text-sm font-semibold text-label">Testo</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setFormat("xlsx");
              setPrepared(null);
            }}
            className={
              "ios-card flex flex-col items-center gap-2 p-4 transition-colors " +
              (format === "xlsx" ? "ring-2 ring-accent" : "")
            }
          >
            <FileSpreadsheet className="h-6 w-6 text-accent" />
            <span className="text-sm font-semibold text-label">Excel</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setFormat("pdf");
              setPrepared(null);
            }}
            className={
              "ios-card flex flex-col items-center gap-2 p-4 transition-colors " +
              (format === "pdf" ? "ring-2 ring-accent" : "")
            }
          >
            <FileText className="h-6 w-6 text-accent" />
            <span className="text-sm font-semibold text-label">PDF</span>
          </button>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-label-secondary">
          Periodo
        </h2>
        <div className="ios-card divide-y divide-separator">
          {PERIODS.map((p) => (
            <button
              type="button"
              disabled={busy}
              key={p.id}
              onClick={() => {
                setPeriod(p.id);
                setPrepared(null);
              }}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm text-label">{p.label}</span>
              <span
                className={
                  "h-4 w-4 rounded-full border " +
                  (period === p.id ? "border-accent bg-accent" : "border-label-tertiary")
                }
              />
            </button>
          ))}
        </div>
      </section>

      {prepared ? (
        <div className="ios-card mt-6 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-label">Riepilogo pronto</div>
              <div className="truncate text-xs text-label-secondary">{prepared.file.name}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={save}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-base font-semibold text-accent-foreground active:scale-[0.97]"
          >
            <Share2 className="h-4 w-4" />
            Salva o condividi
          </button>
          {prepared.format === "pdf" && fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-fill py-3 text-sm font-semibold text-accent active:opacity-70"
            >
              <ExternalLink className="h-4 w-4" /> Apri PDF
            </a>
          )}
          {prepared.format === "txt" && fileUrl && (
            <>
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-fill py-3 text-sm font-semibold text-accent active:opacity-70"
              >
                <ExternalLink className="h-4 w-4" /> Apri testo in un'altra scheda
              </a>
              <button
                type="button"
                onClick={copyText}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-fill py-3 text-sm font-semibold text-accent active:opacity-70"
              >
                <Copy className="h-4 w-4" /> Copia tutto
              </button>
            </>
          )}
          <p className="mt-2 text-center text-[11px] text-label-tertiary">
            Su iPhone scegli “Salva su File” dal menu di condivisione.
          </p>
        </div>
      ) : format === "txt" ? (
        <a
          href={`/profile/export?view=text&period=${period}`}
          target="_blank"
          rel="noopener"
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-base font-semibold text-accent-foreground active:scale-[0.97]"
        >
          <ExternalLink className="h-4 w-4" />
          Esporta e apri tutti i progressi
        </a>
      ) : (
        <button
          type="button"
          onClick={prepare}
          disabled={busy}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-base font-semibold text-accent-foreground active:scale-[0.97] disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {busy ? "Generazione in corso…" : "Prepara riepilogo"}
        </button>
      )}
    </div>
  );
}

function TextExportView({ period }: { period: ExportPeriod }) {
  const [report, setReport] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    prepareTextExport(period)
      .then(async (result) => {
        if (cancelled) return;
        if (result.empty || !result.prepared) {
          setError("Nessun progresso disponibile nel periodo selezionato.");
          return;
        }
        setReport(await result.prepared.file.text());
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Impossibile generare il riepilogo");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
      toast.success("Tutti i progressi sono stati copiati");
    } catch {
      toast.error("Tieni premuto sul testo, scegli Seleziona tutto e poi Copia");
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-background px-4 pb-10 pt-[calc(env(safe-area-inset-top)+20px)]">
      <h1 className="text-2xl font-bold text-label">Tutti i tuoi progressi</h1>
      <p className="mt-1 text-sm text-label-secondary">
        Copia questo testo e incollalo in ChatGPT per creare grafici, confronti e analisi.
      </p>
      {error ? (
        <div className="ios-card mt-6 p-5 text-sm text-danger">{error}</div>
      ) : report ? (
        <>
          <button
            type="button"
            onClick={copyReport}
            className="sticky top-[calc(env(safe-area-inset-top)+8px)] z-10 mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-semibold text-accent-foreground shadow-lg"
          >
            <Copy className="size-4" /> Copia tutti i progressi
          </button>
          <textarea
            readOnly
            aria-label="Riepilogo completo dei progressi"
            value={report}
            className="mt-4 min-h-[70vh] w-full resize-none rounded-2xl border border-separator bg-fill p-4 font-mono text-xs leading-relaxed text-label outline-none"
          />
        </>
      ) : (
        <div className="ios-card mt-6 animate-pulse p-6 text-center text-sm text-label-secondary">
          Preparazione di tutti i progressi…
        </div>
      )}
    </main>
  );
}
