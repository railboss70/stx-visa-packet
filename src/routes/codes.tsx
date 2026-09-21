import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { INDIRECT_CODES, JOB_CODES, WORK_ORDER_CODES, searchCodes } from "@/lib/cost-codes";

export const Route = createFileRoute("/codes")({ component: CodesPage });

export function CodesPage() {
  const [q, setQ] = useState("");
  const job = useMemo(() => (q ? searchCodes(q, "job") : JOB_CODES), [q]);
  const indirect = useMemo(() => (q ? searchCodes(q, "indirect") : INDIRECT_CODES), [q]);
  const wo = useMemo(() => (q ? searchCodes(q, "workOrder") : WORK_ORDER_CODES), [q]);

  return (
    <AppShell>
      <Link to="/" className="text-xs font-medium tracking-wide text-steel uppercase">
        All packets
      </Link>
      <h1 className="mt-1 font-display text-2xl font-semibold text-navy">Cost codes</h1>
      <p className="mt-1 max-w-xl text-sm text-muted">
        Jobs need a job number plus a field code. Work orders still need the job number, then the
        WO labor / materials / other code so the office knows which job it hits. Equipment charges
        skip codes and post the unit + R, M, or U.
      </p>
      <Input
        className="mt-5 max-w-md"
        value={q}
        placeholder="Search water, 61604, palmetto, WO 5…"
        onChange={(e) => setQ(e.target.value)}
      />

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
