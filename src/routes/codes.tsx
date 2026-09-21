import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { INDIRECT_CODES, JOB_CODES, WORK_ORDER_CODES, searchCodes } from "@/lib/cost-codes";
import { STX_FLEET, mergeEquipment, searchEquipment } from "@/lib/equipment";
import { useVisaStore } from "@/lib/store";

export const Route = createFileRoute("/codes")({ component: CodesPage });

export function CodesPage() {
  const [q, setQ] = useState("");
  const saved = useVisaStore((s) => s.settings.equipment ?? []);
  const reports = useVisaStore((s) => s.reports);
  const fleet = useMemo(() => {
    const learned = reports.flatMap((r) =>
      r.charges
        .map((c) => c.equipNumber.trim().toUpperCase())
        .filter(Boolean)
        .map((number) => ({ number, name: "", keywords: [] })),
    );
    return mergeEquipment(STX_FLEET, saved, learned);
  }, [saved, reports]);
  const job = useMemo(() => (q ? searchCodes(q, "job") : JOB_CODES), [q]);
  const indirect = useMemo(() => (q ? searchCodes(q, "indirect") : INDIRECT_CODES), [q]);
  const wo = useMemo(() => (q ? searchCodes(q, "workOrder") : WORK_ORDER_CODES), [q]);
  const equip = useMemo(() => (q ? searchEquipment(q, fleet) : fleet), [q, fleet]);

  return (
    <AppShell>
      <Link to="/" className="text-xs font-medium tracking-wide text-steel uppercase">
        All packets
      </Link>
      <h1 className="mt-1 font-display text-2xl font-semibold text-navy">Cost codes</h1>
      <p className="mt-1 max-w-xl text-sm text-muted">
        Jobs need a job number plus a field code. Work orders still need the job number, then the
        WO labor / materials / other code so the office knows which job it hits. Equipment posts the
        unit + R, M, or U — type backhoe, matt truck, or FC0900.
      </p>
      <Input
        className="mt-5 max-w-md"
        value={q}
        placeholder="Search water, backhoe, 61604, palmetto, WO 5…"
        onChange={(e) => setQ(e.target.value)}
      />

      <Section title="Equipment" note={`${fleet.length} units from the STX fleet directory. Posts as code + R / M / U.`}>
        {equip.length ? (
          <div className="overflow-hidden rounded-lg border border-line bg-card">
            {equip.slice(0, q ? 80 : 40).map((r) => (
              <div key={r.number} className="flex flex-col gap-0.5 border-b border-line px-3 py-2 last:border-0 sm:flex-row sm:items-baseline sm:gap-3">
                <span className="w-24 shrink-0 font-mono text-xs tabular-nums text-navy">{r.number}</span>
                <span className="text-sm">
                  {r.name || "Unit"}
                  {r.assignedTo ? <span className="text-muted"> · {r.assignedTo}</span> : null}
                  {r.flags ? <span className="text-danger"> · {r.flags}</span> : null}
                </span>
              </div>
            ))}
            {!q && fleet.length > 40 ? (
              <p className="px-3 py-2 text-xs text-muted">Showing 40 of {fleet.length}. Type to search the rest.</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted">No units match.</p>
        )}
      </Section>
      <Section title="Job cost codes" note="Use with a 5-digit job number">
        <CodeTable rows={job} />
      </Section>
      <Section title="Indirect" note="Posts job number INDIRECT">
        <CodeTable rows={indirect} />
      </Section>
      <Section title="Work orders" note="Job number plus labor, materials, or other code">
        <CodeTable rows={wo} />
      </Section>
    </AppShell>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold text-navy">{title}</h2>
      <p className="mb-3 text-xs text-muted">{note}</p>
      {children}
    </section>
  );
}

function CodeTable({ rows }: { rows: { code: string; label: string }[] }) {
  if (!rows.length) return <p className="text-sm text-muted">No matches.</p>;
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-card">
      {rows.map((r) => (
        <div key={r.code} className="flex gap-3 border-b border-line px-3 py-2 last:border-0">
          <span className="w-24 shrink-0 font-mono text-xs tabular-nums text-navy">{r.code}</span>
          <span className="text-sm">{r.label}</span>
        </div>
      ))}
    </div>
  );
}
