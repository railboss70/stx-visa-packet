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
import {
  EQUIP_TYPE_CHIPS,
  keywordsFor,
  normalizeEquipNumber,
  searchEquipment,
  type EquipUnit,
} from "@/lib/equipment";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const KINDS: { id: ChargeKind; title: string; hint: string }[] = [
  { id: "job", title: "Job", hint: "Job # + cost code" },
  { id: "workOrder", title: "Work order", hint: "Job # + WO code" },
  { id: "equipment", title: "Equipment", hint: "Search unit + R / M / U" },
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
  fleet,
  onNumber,
  onSuffix,
  onSaveUnit,
}: {
  number: string;
  suffix: EquipSuffix | "";
  labels: { R: string; M: string; U: string };
  fleet: EquipUnit[];
  onNumber: (v: string) => void;
  onSuffix: (v: EquipSuffix) => void;
  onSaveUnit: (unit: EquipUnit) => void;
}) {
  const [query, setQuery] = useState("");
  const [addNumber, setAddNumber] = useState("");
  const [addName, setAddName] = useState("");
  const selected = fleet.find((u) => u.number === number);
  const matches = useMemo(() => searchEquipment(query, fleet), [query, fleet]);
  const shown = query.trim() ? matches.slice(0, 25) : selected ? [selected] : [];

  function pick(unit: EquipUnit) {
    onNumber(unit.number);
    setQuery("");
  }

  function addUnit() {
    const num = normalizeEquipNumber(addNumber || query || number);
    const name = addName.trim();
    if (!num) return;
    const unit: EquipUnit = { number: num, name, keywords: keywordsFor(name) };
    onSaveUnit(unit);
    onNumber(num);
    setQuery("");
    setAddNumber("");
    setAddName("");
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="equip-search">Find equipment</Label>
        <Input
          id="equip-search"
          value={query}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="backhoe, matt truck, FC0900…"
          className="mt-1.5"
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EQUIP_TYPE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setQuery(chip)}
              className={cn(
                "rounded-sm border px-2 py-1 text-xs",
                query.toLowerCase() === chip.toLowerCase()
                  ? "border-navy bg-navy text-primary-foreground"
                  : "border-line bg-card text-muted hover:bg-paper-2",
              )}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {shown.length ? (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-line bg-card">
          {query.trim() ? (
            <p className="border-b border-line px-3 py-1.5 text-[11px] text-muted">
              {matches.length} match{matches.length === 1 ? "" : "es"}
            </p>
          ) : null}
          {shown.map((unit) => {
            const active = number === unit.number;
            const detail = [unit.assignedTo, unit.site].filter(Boolean).join(" · ");
            const meta = [unit.year, unit.make, unit.model].filter(Boolean).join(" ");
            return (
              <button
                key={unit.number}
                type="button"
                onClick={() => pick(unit)}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-b border-line px-3 py-2.5 text-left last:border-0",
                  active ? "bg-navy text-primary-foreground" : "hover:bg-paper-2",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm">{unit.number}</span>
                  {unit.flags ? (
                    <span className={cn("text-[10px] font-semibold uppercase tracking-wide", active ? "text-primary-foreground/80" : "text-danger")}>
                      {unit.flags}
                    </span>
                  ) : null}
                </span>
                <span className={cn("text-sm", active ? "text-primary-foreground" : "text-ink")}>
                  {unit.name || "Unit"}
                  {detail ? (
                    <span className={cn("font-normal", active ? "text-primary-foreground/75" : "text-muted")}>
                      {" · "}
                      {detail}
                    </span>
                  ) : null}
                </span>
                {meta ? (
                  <span className={cn("text-[11px]", active ? "text-primary-foreground/70" : "text-subtle")}>{meta}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted">
          {query.trim()
            ? "No units match that. Add it below if it is a new number."
            : "Type backhoe, a name, or a code. Example: RE0400 · Tundra · Matt Pitsenbarger"}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input
          value={addNumber}
          placeholder="Unit number"
          className="font-mono uppercase"
          onChange={(e) => setAddNumber(normalizeEquipNumber(e.target.value))}
        />
        <Input
          value={addName}
          placeholder="Backhoe, loader…"
          onChange={(e) => setAddName(e.target.value)}
        />
        <button
          type="button"
          onClick={addUnit}
          className="h-10 rounded-md border border-line bg-card px-3 text-sm font-medium hover:bg-paper-2"
        >
          Save unit
        </button>
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
          {selected?.name ? <span className="font-sans text-muted"> · {selected.name}</span> : null}
        </p>
      ) : null}
    </div>
  );
}

export { JOB_CODES, INDIRECT_CODES, WORK_ORDER_CODES };
