import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVisaStore } from "@/lib/store";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

export function SettingsPage() {
  const settings = useVisaStore((s) => s.settings);
  const updateSettings = useVisaStore((s) => s.updateSettings);

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
    </AppShell>
  );
}
