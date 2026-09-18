import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const pageSchema = z.object({
  b64: z.string().max(2_000_000),
  mime: z.string(),
});

const statementInput = z.object({
  pages: z.array(pageSchema).min(1).max(4),
});

const receiptInput = z.object({
  image: pageSchema,
});

export type AiStatement = {
  employeeName: string;
  last4: string;
  closingDate: string;
  charges: Array<{
    transDate: string;
    postDate: string;
    vendor: string;
    orderNo: string;
    amount: number;
    description: string;
  }>;
};

export type AiReceipt = {
  vendor: string;
  date: string;
  amount: number;
  description: string;
  items: string[];
};

export const parseStatementAi = createServerFn({ method: "POST" })
  .validator((input: unknown) => statementInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI is not available" };

    const prompt = `You extract Synovus / Visa commercial card statement data.
Return JSON only:
{
  "employeeName": string,
  "last4": string,
  "closingDate": "YYYY-MM-DD",
  "charges": [
    { "transDate":"YYYY-MM-DD", "postDate":"YYYY-MM-DD", "vendor": string, "orderNo": string, "amount": number, "description": string }
  ]
}
Rules:
- transDate is the transaction date, postDate is the post date.
- Ignore MEMO ITEM lines, payments, credits of $0, finance charges labeled N/A, and summary totals.
- amount is a number like 21.40 (no $).
- vendor is the merchant name, cleaned (no city/state if possible).
- description may be blank.
- last4 is the last four of the card.`;

    const content: unknown[] = [{ type: "text", text: prompt }];
    for (const page of data.pages) {
      content.push({
        type: "image_url",
        image_url: { url: `data:${page.mime};base64,${page.b64}` },
      });
    }

    const text = await callGrok(apiKey, content, 1800);
    if (!text.ok) return text;
    try {
      const parsed = JSON.parse(stripFence(text.text)) as AiStatement;
      parsed.charges = Array.isArray(parsed.charges) ? parsed.charges : [];
      return { ok: true as const, data: parsed };
    } catch {
      return { ok: false as const, error: "Could not read the statement" };
    }
  });

export const parseReceiptAi = createServerFn({ method: "POST" })
  .validator((input: unknown) => receiptInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI is not available" };

    const prompt = `Read this purchase receipt. Return JSON only:
{
  "vendor": string,
  "date": "YYYY-MM-DD",
  "amount": number,
  "description": string,
  "items": string[]
}
description should be a short coding note (e.g. "Water", "Fuel", "PPE"). amount is the total charged.`;

    const text = await callGrok(
      apiKey,
      [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: { url: `data:${data.image.mime};base64,${data.image.b64}` },
        },
      ],
      800,
    );
    if (!text.ok) return text;
    try {
      const parsed = JSON.parse(stripFence(text.text)) as AiReceipt;
      return { ok: true as const, data: parsed };
    } catch {
      return { ok: false as const, error: "Could not read the receipt" };
    }
  });

async function callGrok(apiKey: string, content: unknown[], maxTokens: number) {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0,
      max_tokens: maxTokens,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) {
    return { ok: false as const, error: `xAI API error ${res.status}` };
  }
  const body = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return { ok: true as const, text: body.choices[0]?.message.content ?? "" };
}

function stripFence(s: string) {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}
