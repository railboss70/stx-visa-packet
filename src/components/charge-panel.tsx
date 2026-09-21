import { useMemo, useState, type ReactNode } from "react";
import { WORK_ORDER_CODES, suggestCodes, woLabel } from "@/lib/cost-codes";
import type { AppSettings, Charge, ChargeKind, EquipSuffix } from "@/lib/types";
import { formatMdY, formatMoney } from "@/lib/utils";
import { CodeList, EquipmentCoder, KindToggle, WorkOrderPicker } from "./code-picker";
import { ReceiptDrop } from "./receipt-drop";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";

export function ChargePanel({
  charge,
  settings,
  busyRead,
  onPatch,
  onKind,
  onReadReceipt,
}: {
  charge: Charge;
  settings: AppSettings;
  busyRead?: boolean;
  onPatch: (patch: Partial<Charge>) => void;
  onKind: (kind: ChargeKind) => void;
  onReadReceipt?: (receiptId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const suggestions = useMemo(
    () =>
      suggestCodes({
        description: charge.description,
        vendor: charge.vendor,
        kind: charge.kind === "equipment" ? "equipment" : charge.kind,
      }),
    [charge.description, charge.vendor, charge.kind],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-navy">
            {charge.vendor || "New charge"}
          </h2>
          <p className="text-sm text-muted">
            {charge.transDate ? formatMdY(charge.transDate) : "No date"}
            {charge.amount ? ` · ${formatMoney(charge.amount)}` : ""}
            {charge.orderNo ? ` · ${charge.orderNo}` : ""}
          </p>
        </div>
        {charge.kind === "workOrder" && charge.jobNumber && charge.costCode ? (
          <Badge tone="ok">
            {charge.jobNumber} · {charge.costCode}
          </Badge>
        ) : charge.kind && charge.costCode ? (
          <Badge tone="ok">{charge.costCode}</Badge>
        ) : charge.kind === "equipment" && charge.equipSuffix ? (
          <Badge tone="ok">
            {charge.equipNumber}
            {charge.equipSuffix}
          </Badge>
        ) : (
          <Badge tone="warn">Needs coding</Badge>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Purchase date">
          <Input
            type="date"
            value={charge.transDate}
            onChange={(e) => onPatch({ transDate: e.target.value })}
          />
        </Field>
        <Field label="Vendor">
          <Input
            value={charge.vendor}
            placeholder="Dollar General"
            onChange={(e) => onPatch({ vendor: e.target.value })}
          />
        </Field>
        <Field label="Amount">
          <Input
            inputMode="decimal"
            value={charge.amount ? String(charge.amount) : ""}
            placeholder="0.00"
            onChange={(e) => onPatch({ amount: Number(e.target.value) || 0 })}
          />
        </Field>
      </div>

      <Field label="What did you buy?">
        <Input
          value={charge.description}
          placeholder="Water, fuel, PPE, blades…"
          onChange={(e) => onPatch({ description: e.target.value })}
        />
      </Field>

      <div>
        <Label>How should this post?</Label>
        <div className="mt-1.5">
          <KindToggle value={charge.kind} onChange={onKind} />
        </div>
      </div>

      {suggestions.length > 0 && charge.kind !== "equipment" && charge.kind !== "workOrder" ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s.code}
              type="button"
              onClick={() =>
                onPatch({
                  costCode: s.code,
                  costLabel: s.label,
                  kind: s.bucket === "indirect" ? "indirect" : "job",
                  jobNumber: s.bucket === "indirect" ? "INDIRECT" : charge.jobNumber,
                })
              }
              className="rounded-sm border border-line bg-paper-2 px-2 py-1 text-left text-xs hover:border-navy"
            >
              <span className="font-mono">{s.code}</span>
              <span className="text-muted"> {s.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {charge.kind === "job" ? (
        <div className="space-y-3">
          <Field label="Job number">
            <Input
              value={charge.jobNumber}
              placeholder="25125"
              className="font-mono"
              onChange={(e) => onPatch({ jobNumber: e.target.value.replace(/[^\d]/g, "") })}
            />
          </Field>
          <Field label="Cost code">
            <Input
              value={query}
              placeholder="Search ice, fuel, PPE, 61604…"
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
          <CodeList
            bucket="job"
            query={query || charge.costCode}
            selected={charge.costCode}
            onSelect={(c) => {
              onPatch({ costCode: c.code, costLabel: c.label });
              setQuery("");
            }}
          />
        </div>
      ) : null}

      {charge.kind === "indirect" ? (
        <div className="space-y-3">
          <Field label="Indirect code">
            <Input
              value={query}
              placeholder="Search yard, software, AI, 500.025…"
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
          <CodeList
            bucket="indirect"
            query={query || charge.costCode}
            selected={charge.costCode}
            onSelect={(c) => {
              onPatch({
                costCode: c.code,
                costLabel: c.label,
                jobNumber: "INDIRECT",
              });
              setQuery("");
            }}
          />
        </div>
      ) : null}

      {charge.kind === "workOrder" ? (
        <div className="space-y-3">
          <Field label="Job number">
            <Input
              value={charge.jobNumber}
              placeholder="Which job does this WO hit?"
              className="font-mono"
              onChange={(e) => onPatch({ jobNumber: e.target.value.replace(/[^\d]/g, "") })}
            />
          </Field>
          <WorkOrderPicker
            woNumber={charge.woNumber}
            woType={charge.woType}
            onChange={(wo, type) => {
              const match = WORK_ORDER_CODES.find((c) => c.woNumber === wo && c.woType === type);
              onPatch({
                woNumber: wo,
                woType: type,
                costCode: match?.code ?? "",
                costLabel: match?.label ?? woLabel(wo),
                equipNumber: "",
                equipSuffix: "",
              });
            }}
          />
        </div>
      ) : null}

      {charge.kind === "equipment" ? (
        <EquipmentCoder
          number={charge.equipNumber}
          suffix={charge.equipSuffix}
          labels={{ R: settings.suffixR, M: settings.suffixM, U: settings.suffixU }}
          onNumber={(v) => onPatch({ equipNumber: v, jobNumber: "", costCode: "", costLabel: "" })}
          onSuffix={(v: EquipSuffix) =>
            onPatch({ equipSuffix: v, jobNumber: "", costCode: "", costLabel: "" })
          }
        />
      ) : null}

      <div>
        <Label>Receipt</Label>
        <div className="mt-1.5">
          <ReceiptDrop
            receipts={charge.receipts}
            busy={busyRead}
            onChange={(receipts) => onPatch({ receipts })}
            onRead={onReadReceipt ? (r) => onReadReceipt(r.id) : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  );
}
