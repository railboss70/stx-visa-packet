import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FilePlus2, Trash2, Copy } from "lucide-react";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { StxMark } from "@/components/stx-mark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { julySample } from "@/lib/sample";
import { useVisaStore } from "@/lib/store";
import { isCoded, packetFileName, reportTotal, type VisaReport } from "@/lib/types";
import { fileToDataUrl, formatMdY, formatMoney, assetUrl } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

export function Home() {
  const navigate = useNavigate();
  const hydrated = useVisaStore((s) => s.hydrated);
  const reports = useVisaStore((s) => s.reports);
  const createReport = useVisaStore((s) => s.createReport);
  const deleteReport = useVisaStore((s) => s.deleteReport);
  const duplicateReport = useVisaStore((s) => s.duplicateReport);
  const setHydrated = useVisaStore((s) => s.setHydrated);

  useEffect(() => {
    const unsub = useVisaStore.persist.onFinishHydration(() => setHydrated());
    if (useVisaStore.persist.hasHydrated()) setHydrated();
    return unsub;
  }, [setHydrated]);

  function startBlank() {
    const report = createReport();
    void navigate({ to: "/reports/$id", params: { id: report.id } });
  }

  function startSample() {
    void (async () => {
      try {
        const [stmt, rec] = await Promise.all([
          fetch(assetUrl("samples/statement-jul-2026.pdf"))
            .then((r) => r.blob())
            .then(fileToDataUrl),
          fetch(assetUrl("samples/receipt-jul-2026.pdf"))
            .then((r) => r.blob())
            .then(fileToDataUrl),
        ]);
        const report = createReport(julySample(stmt, rec));
        void navigate({ to: "/reports/$id", params: { id: report.id } });
      } catch {
        const report = createReport(julySample());
        void navigate({ to: "/reports/$id", params: { id: report.id } });
      }
    })();
  }

  return (
    <AppShell>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <StxMark size="hero" />
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy">
            Visa Packet
          </h1>
          <p className="mt-2 max-w-xl text-muted">
            Drop a Synovus statement, code each charge to a job, work order, equipment unit, or
            indirect, attach receipts, and download the packet accounting wants.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={startSample}>
            Load July 31 example
          </Button>
          <Button onClick={startBlank}>
            <FilePlus2 /> New week
          </Button>
        </div>
      </div>

      {!hydrated ? (
        <div className="h-40 animate-pulse rounded-xl bg-paper-2" />
      ) : reports.length === 0 ? (
        <EmptyState onNew={startBlank} onSample={startSample} />
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              onOpen={() => navigate({ to: "/reports/$id", params: { id: r.id } })}
              onCopy={() => {
                const copy = duplicateReport(r.id);
                if (copy) void navigate({ to: "/reports/$id", params: { id: copy.id } });
              }}
              onDelete={() => deleteReport(r.id)}
            />
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function ReportCard({
  report,
  onOpen,
  onCopy,
  onDelete,
}: {
  report: VisaReport;
  onOpen: () => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const coded = report.charges.filter(isCoded).length;
  const receipts = report.charges.filter((c) => c.receipts.length > 0).length;
  const ready = report.charges.length > 0 && coded === report.charges.length;
  return (
    <li className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onOpen} className="min-w-0 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-semibold text-navy">
              {report.weekEnding ? `Week ending ${formatMdY(report.weekEnding)}` : "No week ending"}
            </span>
            <Badge tone={ready ? "ok" : "warn"}>
              {ready ? "Ready" : coded ? `${coded}/${report.charges.length} coded` : "Draft"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {report.employeeName || "No name"} · ••••{report.last4 || "————"} ·{" "}
            {report.charges.length} charge{report.charges.length === 1 ? "" : "s"} · {receipts}{" "}
            receipt{receipts === 1 ? "" : "s"} · {formatMoney(reportTotal(report))}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-subtle">{packetFileName(report)}</p>
        </button>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Duplicate" onClick={onCopy}>
            <Copy />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Delete" onClick={onDelete}>
            <Trash2 />
          </Button>
          <Button onClick={onOpen}>Open</Button>
        </div>
      </div>
    </li>
  );
}

function EmptyState({ onNew, onSample }: { onNew: () => void; onSample: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-card px-6 py-14 text-center">
      <div className="mx-auto flex justify-center">
        <StxMark size="hero" />
      </div>
      <h2 className="mt-5 font-display text-xl font-semibold text-navy">No packets yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Start a week, drop the Visa statement, code the charges the same way you do on the paper
        form, then download statement + summary + receipts as one PDF.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={onSample}>
          Load July 31 example
        </Button>
        <Button onClick={onNew}>Start a week</Button>
      </div>
    </div>
  );
}
