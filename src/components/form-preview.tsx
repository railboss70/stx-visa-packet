import { isCoded, reportTotal, type VisaReport } from "@/lib/types";
import { formatMdY, formatMoney } from "@/lib/utils";
import { StxMark } from "./stx-mark";

export function FormPreview({ report }: { report: VisaReport }) {
  const rows = [...report.charges];
  while (rows.length < 8) rows.push(null as never);
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-card p-4 shadow-[var(--shadow-border)]">
      <div className="min-w-[720px]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <StxMark size="form" />
          <div className="text-center">
            <div className="font-display text-sm font-semibold tracking-[0.12em] text-ink">
              VISA CARD EXPENSE SUMMARY
            </div>
          </div>
          <div className="text-right text-xs">
            <span className="text-muted">Week Ending:</span>{" "}
            <span className="font-semibold text-or">
              {report.weekEnding ? formatMdY(report.weekEnding) : "——"}
            </span>
          </div>
        </div>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="border border-line-strong px-2 py-1.5 text-left font-semibold">
                Employee Name
              </th>
              <th className="border border-line-strong px-2 py-1.5" colSpan={2}>
                {report.employeeName}
              </th>
              <th className="border border-line-strong px-2 py-1.5 font-semibold">Last 4 Card #'s</th>
              <th className="border border-line-strong px-2 py-1.5">{report.last4}</th>
              <th className="border border-line-strong px-2 py-1.5 font-semibold">Total Expenses</th>
              <th className="border border-line-strong px-2 py-1.5 tabular-nums">
                {formatMoney(reportTotal(report))}
              </th>
            </tr>
            <tr className="bg-paper-2">
              <th className="border border-line-strong px-2 py-1.5 font-semibold">Purchase Date</th>
              <th className="border border-line-strong px-2 py-1.5 font-semibold">Vendor</th>
              <th className="border border-line-strong px-2 py-1.5 font-semibold">Detailed Description</th>
              <th className="border border-line-strong px-2 py-1.5 font-semibold">Equip Number</th>
              <th className="border border-line-strong px-2 py-1.5 font-semibold">
                <span className="text-or">or</span> Job Number
              </th>
              <th className="border border-line-strong px-2 py-1.5 font-semibold">Cost Code</th>
              <th className="border border-line-strong px-2 py-1.5 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={c?.id ?? `blank-${i}`} className="h-8">
                <td className="border border-line px-2 tabular-nums">
                  {c?.transDate ? formatMdY(c.transDate) : ""}
                </td>
                <td className="border border-line px-2">{c?.vendor ?? ""}</td>
                <td className="border border-line px-2">{c?.description ?? ""}</td>
                <td className="border border-line px-2 text-center font-mono">
                  {c?.kind === "equipment"
                    ? `${c.equipNumber}${c.equipSuffix}`
                    : ""}
                </td>
                <td className="border border-line px-2 text-center font-mono">
                  {c && c.kind !== "equipment" ? c.jobNumber : ""}
                </td>
                <td className="border border-line px-2 text-center font-mono">
                  {c && c.kind !== "equipment" ? c.costCode : ""}
                </td>
                <td className="border border-line px-2 text-right tabular-nums">
                  {c?.amount ? formatMoney(c.amount) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-muted">
          {report.charges.filter(isCoded).length}/{report.charges.length || 0} coded
          {" · "}
          {report.charges.filter((c) => c.receipts.length > 0).length} with receipts
        </p>
      </div>
    </div>
  );
}
