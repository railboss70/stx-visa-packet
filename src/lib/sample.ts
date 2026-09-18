import { emptyCharge, type VisaReport } from "./types";
import { uid } from "./utils";

export function julySample(statementDataUrl = "", receiptDataUrl = ""): VisaReport {
  const now = new Date().toISOString();
  return {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    weekEnding: "2026-07-31",
    employeeName: "Matthew Pitsenbarger",
    last4: "5935",
    statementName: statementDataUrl ? "Synovus statement 07-31-26.pdf" : "",
    statementDataUrl,
    charges: [
      emptyCharge({
        transDate: "2026-07-28",
        postDate: "2026-07-29",
        vendor: "Dollar General",
        amount: 21.4,
        description: "Water",
        kind: "job",
        jobNumber: "25125",
        costCode: "61604",
        costLabel: "Project — Ice and Water",
        receipts: receiptDataUrl
          ? [
              {
                id: uid(),
                name: "DG-24319-Calera.jpg",
                mime: "image/jpeg",
                dataUrl: receiptDataUrl,
              },
            ]
          : [],
      }),
    ],
  };
}
