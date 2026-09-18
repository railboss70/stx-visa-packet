export async function parseStatementAi(_input?: { data?: unknown }) {
  return { ok: false as const, error: "AI is not available on the phone app" };
}

export async function parseReceiptAi(_input?: { data?: unknown }) {
  return { ok: false as const, error: "AI is not available on the phone app" };
}
