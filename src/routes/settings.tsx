import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/input";
import { mergeEquipment, parseEquipPaste } from "@/lib/equipment";
import { useVisaStore } from "@/lib/store";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

export function SettingsPage() {
  const settings = useVisaStore((s) => s.settings);
  const updateSettings = useVisaStore((s) => s.updateSettings);
  const [paste, setPaste] = useState("");
  const [addNumber, setAddNumber] = useState("");
  const [addName, setAddName] = useState("");
  const fleet = settings.equipment ?? [];

  function saveFleet(next: typeof fleet) {
    updateSettings({ equipment: mergeEquipment(next) });
  }

  return (
    <AppShell>
      <Link to="/" className="text-xs font-medium tracking-wide text-steel uppercase">
        All packets
      </Link>
      <h1 className="mt-1 font-display text-2xl font-semibold text-navy">Defaults</h1>
      <p className="mt-1 max-w-lg text-sm text-muted">
        Used on every new week. Equipment suffixes post as the unit number plus the letter — FC1400R.
        Change the labels if your shop uses different words.
      </p>

      <div className="mt-6 max-w-lg space-y-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
        <label className="block space-y-1.5">
          <Label>Employee name</Label>
          <Input
            value={settings.employeeName}
            onChange={(e) => updateSettings({ employeeName: e.target.value })}
          />
        </label>
        <label className="block space-y-1.5">
          <Label>Card last 4</Label>
          <Input
            value={settings.last4}
            maxLength={4}
            className="font-mono"
            onChange={(e) =>
              updateSettings({ last4: e.target.value.replace(/\D/g, "").slice(0, 4) })
            }
          />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="space-y-1.5">
            <Label>R means</Label>
            <Input
              value={settings.suffixR}
              onChange={(e) => updateSettings({ suffixR: e.target.value })}
            />
          </label>
          <label className="space-y-1.5">
            <Label>M means</Label>
            <Input
              value={settings.suffixM}
              onChange={(e) => updateSettings({ suffixM: e.target.value })}
            />
          </label>
          <label className="space-y-1.5">
            <Label>U means</Label>
            <Input
              value={settings.suffixU}
              onChange={(e) => updateSettings({ suffixU: e.target.value })}
            />
          </label>
        </div>
      </div>

      <h2 className="mt-8 font-display text-lg font-semibold text-navy">Equipment directory</h2>
      <p className="mt-1 max-w-lg text-sm text-muted">
        Type backhoe or loader on a charge and these units pop up. Paste one per line:
        <span className="font-mono text-ink"> FC1400 Backhoe</span>
      </p>

      <div className="mt-4 max-w-lg space-y-3 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input
            value={addNumber}
            placeholder="FC1400"
            className="font-mono uppercase"
            onChange={(e) => setAddNumber(e.target.value.toUpperCase())}
          />
          <Input
            value={addName}
            placeholder="Backhoe"
            onChange={(e) => setAddName(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!addNumber.trim()) return;
              saveFleet([...fleet, { number: addNumber, name: addName, keywords: [] }]);
              setAddNumber("");
              setAddName("");
            }}
          >
            Add
          </Button>
        </div>
        <label className="block space-y-1.5">
          <Label>Paste a list</Label>
          <Textarea
            value={paste}
            placeholder={"FC1400 Backhoe\nL210 Loader\nEX55 Excavator"}
            className="min-h-28 font-mono text-xs"
            onChange={(e) => setPaste(e.target.value)}
          />
        </label>
        <Button
          type="button"
          onClick={() => {
            const parsed = parseEquipPaste(paste);
            if (!parsed.length) return;
            saveFleet([...fleet, ...parsed]);
            setPaste("");
          }}
        >
          Load pasted units
        </Button>

        {fleet.length ? (
          <div className="max-h-72 overflow-y-auto rounded-lg border border-line">
            {mergeEquipment(fleet).map((u) => (
              <div
                key={u.number}
                className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 last:border-0"
              >
                <div>
                  <div className="font-mono text-sm text-navy">{u.number}</div>
                  <div className="text-xs text-muted">{u.name || "Unit"}</div>
                </div>
                <button
                  type="button"
                  className="text-xs text-muted hover:text-danger"
                  onClick={() => saveFleet(fleet.filter((x) => x.number !== u.number))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Nothing saved yet.</p>
        )}
      </div>
    </AppShell>
  );
}
