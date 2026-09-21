import { useMemo, useState } from "react";
import {
  INDIRECT_CODES,
  JOB_CODES,
  WORK_ORDER_CODES,
  searchCodes,
  woLabel,
  type CostCode,
} from "@/lib/cost-codes";
import type { ChargeKind, EquipSuffix } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const KINDS: { id: ChargeKind; title: string; hint: string }[] = [
  { id: "job", title: "Job", hint: "Job # + cost code" },
  { id: "workOrder", title: "Work order", hint: "Job # + WO code" },
  { id: "equipment", title: "Equipment", hint: "Unit + R / M / U" },
  { id: "indirect", title: "Indirect", hint: "500 / 600 codes" },
];

export function KindToggle({
  value,
  onChange,
}: {
  value: ChargeKind | null;
  onChange: (kind: ChargeKind) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {KINDS.map((k) => {
        const on = value === k.id;
        return (
          <button
            key={k.id}
            type="button"
            onClick={() => onChange(k.id)}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-left transition-[background-color,border-color,transform] duration-150",
              on
                ? "border-navy bg-navy text-primary-foreground"
                : "border-line bg-card text-ink hover:bg-paper-2",
            )}
          >
            <div className="font-display text-sm font-semibold">{k.title}</div>
            <div className={cn("text-[11px]", on ? "text-primary-foreground/70" : "text-muted")}>
              {k.hint}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function CodeList({
  bucket,
  query,
  selected,
  onSelect,
}: {
  bucket: "job" | "indirect";
  query: string;
  selected?: string;
  onSelect: (code: CostCode) => void;
}) {
  const list = useMemo(() => {
    const found = searchCodes(query, bucket);
    return found.slice(0, 40);
  }, [bucket, query]);

  return (
    <div className="max-h-56 overflow-auto rounded-md border border-line bg-card">
      {list.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted">No codes match.</p>
      ) : (
        list.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => onSelect(c)}
            className={cn(
              "flex w-full items-baseline gap-3 border-b border-line px-3 py-2 text-left last:border-0",
              selected === c.code ? "bg-navy text-primary-foreground" : "hover:bg-paper-2",
            )}
          >
            <span className="font-mono text-xs tabular-nums">{c.code}</span>
            <span className="text-sm">{c.label}</span>
          </button>
        ))
      )}
    </div>
  );
}

export function WorkOrderPicker({
  woNumber,
  woType,
  onChange,
}: {
  woNumber: string;
  woType: "labor" | "materials" | "other" | "";
  onChange: (wo: string, type: "labor" | "materials" | "other") => void;
}) {
  const types = [
    { id: "labor" as const, label: "Labor" },
    { id: "materials" as const, label: "Materials" },
    { id: "other" as const, label: "Other" },
  ];
  const numbers = ["INS", ...Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(3, "0"))];

  return (
    <div className="space-y-3">
      <div>
        <Label>Work order</Label>
        <div className="mt-1.5 grid grid-cols-5 gap-1.5 sm:grid-cols-7">
          {numbers.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n, woType || "other")}
              className={cn(
                "h-9 rounded-sm border text-xs font-medium",
                woNumber === n
                  ? "border-navy bg-navy text-primary-foreground"
                  : "border-line bg-card hover:bg-paper-2",
              )}
            >
              {n === "INS" ? "Insp" : n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Type</Label>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {types.map((t) => {
            const disabled = woNumber === "INS" && t.id === "materials";
            return (
              <button
                key={t.id}
                type="button"
                disabled={disabled}
                onClick={() => woNumber && onChange(woNumber, t.id)}
                className={cn(
                  "h-10 rounded-md border text-sm font-medium disabled:opacity-30",
                  woType === t.id
                    ? "border-navy bg-navy text-primary-foreground"
                    : "border-line bg-card hover:bg-paper-2",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      {woNumber ? (
        <p className="text-sm text-muted">
          {woLabel(woNumber)}
          {woType ? ` — ${woType}` : " — pick Labor, Materials, or Other"}
        </p>
      ) : null}
    </div>
  );
}

export function EquipmentCoder({
  number,
  suffix,
  labels,
  onNumber,
  onSuffix,
}: {
  number: string;
  suffix: EquipSuffix | "";
  labels: { R: string; M: string; U: string };
  onNumber: (v: string) => void;
  onSuffix: (v: EquipSuffix) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="equip">Equipment number</Label>
        <Input
          id="equip"
          value={number}
          autoCapitalize="characters"
          placeholder="FC1400"
          className="mt-1.5 font-mono uppercase"
          onChange={(e) => onNumber(e.target.value.toUpperCase())}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["R", "M", "U"] as EquipSuffix[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuffix(s)}
            className={cn(
              "rounded-md border px-2 py-2.5 text-center",
              suffix === s
                ? "border-navy bg-navy text-primary-foreground"
                : "border-line bg-card hover:bg-paper-2",
            )}
          >
            <div className="font-display text-lg font-semibold">{s}</div>
            <div className={cn("text-[11px]", suffix === s ? "text-primary-foreground/70" : "text-muted")}>
              {labels[s]}
            </div>
          </button>
        ))}
      </div>
      {number && suffix ? (
        <p className="font-mono text-sm text-navy">
          Posts as <span className="font-semibold">{number.trim()}{suffix}</span>
        </p>
      ) : null}
    </div>
  );
}

export { JOB_CODES, INDIRECT_CODES, WORK_ORDER_CODES };
