import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { exportToExcel, exportToPDF, type ExportPeriod } from "@/lib/export-progress";

export const Route = createFileRoute("/_authenticated/profile/export")({
  component: ExportPage,
});

const PERIODS: Array<{ id: ExportPeriod; label: string }> = [
  { id: "1m", label: "Ultimo mese" },
  { id: "3m", label: "Ultimi 3 mesi" },
  { id: "1y", label: "Ultimo anno" },
  { id: "all", label: "Da sempre" },
];

function ExportPage() {
  const [format, setFormat] = useState<"pdf" | "xlsx">("xlsx");
  const [period, setPeriod] = useState<ExportPeriod>("3m");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const result = format === "xlsx" ? await exportToExcel(period) : await exportToPDF(period);
      if (result.empty) {
        toast.error("Nessun dato nel periodo selezionato");
      } else {
        toast.success("File generato");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore durante l'esportazione");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
      <Link
        to="/profile"
        className="mb-2 inline-flex items-center gap-1 text-sm text-accent"
      >
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
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setFormat("xlsx")}
            className={
              "ios-card flex flex-col items-center gap-2 p-4 transition-colors " +
              (format === "xlsx" ? "ring-2 ring-accent" : "")
            }
          >
            <FileSpreadsheet className="h-6 w-6 text-accent" />
            <span className="text-sm font-semibold text-label">Excel</span>
          </button>
          <button
            onClick={() => setFormat("pdf")}
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
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm text-label">{p.label}</span>
              <span
                className={
                  "h-4 w-4 rounded-full border " +
                  (period === p.id
                    ? "border-accent bg-accent"
                    : "border-label-tertiary")
                }
              />
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={run}
        disabled={busy}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-base font-semibold text-accent-foreground active:scale-[0.97] disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
        {busy ? "Generazione in corso…" : "Scarica"}
      </button>
    </div>
  );
}
