import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_SETTINGS,
  emptyCharge,
  type AppSettings,
  type Charge,
  type ChargeKind,
  type VisaReport,
} from "./types";
import { uid } from "./utils";

type Store = {
  hydrated: boolean;
  settings: AppSettings;
  reports: VisaReport[];
  setHydrated: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  createReport: (seed?: Partial<VisaReport>) => VisaReport;
  duplicateReport: (id: string) => VisaReport | null;
  deleteReport: (id: string) => void;
  updateReport: (id: string, patch: Partial<VisaReport>) => void;
  addCharge: (reportId: string, charge?: Partial<Charge>) => Charge | null;
  updateCharge: (reportId: string, chargeId: string, patch: Partial<Charge>) => void;
  removeCharge: (reportId: string, chargeId: string) => void;
  applyKind: (reportId: string, chargeId: string, kind: ChargeKind) => void;
};

function touch(report: VisaReport): VisaReport {
  return { ...report, updatedAt: new Date().toISOString() };
}

export const useVisaStore = create<Store>()(
  persist(
    (set, get) => ({
      hydrated: false,
      settings: DEFAULT_SETTINGS,
      reports: [],
      setHydrated: () => set({ hydrated: true }),
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      createReport: (seed) => {
        const settings = get().settings;
        const now = new Date().toISOString();
        const report: VisaReport = {
          id: uid(),
          createdAt: now,
          updatedAt: now,
          weekEnding: seed?.weekEnding ?? "",
          employeeName: seed?.employeeName ?? settings.employeeName,
          last4: seed?.last4 ?? settings.last4,
          statementName: seed?.statementName ?? "",
          statementDataUrl: seed?.statementDataUrl ?? "",
          charges: seed?.charges ?? [],
        };
        set((s) => ({ reports: [report, ...s.reports] }));
        return report;
      },
      duplicateReport: (id) => {
        const src = get().reports.find((r) => r.id === id);
        if (!src) return null;
        const now = new Date().toISOString();
        const copy: VisaReport = {
          ...src,
          id: uid(),
          createdAt: now,
          updatedAt: now,
          charges: src.charges.map((c) => ({
            ...c,
            id: uid(),
            receipts: c.receipts.map((r) => ({ ...r, id: uid() })),
          })),
        };
        set((s) => ({ reports: [copy, ...s.reports] }));
        return copy;
      },
      deleteReport: (id) =>
        set((s) => ({ reports: s.reports.filter((r) => r.id !== id) })),
      updateReport: (id, patch) =>
        set((s) => ({
          reports: s.reports.map((r) => (r.id === id ? touch({ ...r, ...patch }) : r)),
        })),
      addCharge: (reportId, charge) => {
        const next = emptyCharge(charge);
        set((s) => ({
          reports: s.reports.map((r) =>
            r.id === reportId ? touch({ ...r, charges: [...r.charges, next] }) : r,
          ),
        }));
        return next;
      },
      updateCharge: (reportId, chargeId, patch) =>
        set((s) => ({
          reports: s.reports.map((r) =>
            r.id === reportId
              ? touch({
                  ...r,
                  charges: r.charges.map((c) => (c.id === chargeId ? { ...c, ...patch } : c)),
                })
              : r,
          ),
        })),
      removeCharge: (reportId, chargeId) =>
        set((s) => ({
          reports: s.reports.map((r) =>
            r.id === reportId
              ? touch({ ...r, charges: r.charges.filter((c) => c.id !== chargeId) })
              : r,
          ),
        })),
      applyKind: (reportId, chargeId, kind) =>
        set((s) => ({
          reports: s.reports.map((r) => {
            if (r.id !== reportId) return r;
            return touch({
              ...r,
              charges: r.charges.map((c) => {
                if (c.id !== chargeId) return c;
                const base: Charge = {
                  ...c,
                  kind,
                  jobNumber: "",
                  costCode: "",
                  costLabel: "",
                  woNumber: "",
                  woType: "",
                  equipNumber: kind === "equipment" ? c.equipNumber : "",
                  equipSuffix: kind === "equipment" ? c.equipSuffix : "",
                };
                if (kind === "indirect") base.jobNumber = "INDIRECT";
                return base;
              }),
            });
          }),
        })),
    }),
    {
      name: "stx-visa-packet",
      partialize: (s) => ({ settings: s.settings, reports: s.reports }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as { settings?: AppSettings; reports?: VisaReport[] };
        return {
          ...current,
          ...p,
          settings: {
            ...DEFAULT_SETTINGS,
            ...(p.settings ?? {}),
            equipment: Array.isArray(p.settings?.equipment) ? p.settings.equipment : [],
          },
          reports: Array.isArray(p.reports) ? p.reports : current.reports,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

export function useReport(id: string | undefined) {
  return useVisaStore((s) => s.reports.find((r) => r.id === id));
}
