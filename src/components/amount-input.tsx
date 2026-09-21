import { useEffect, useState } from "react";
import { Input } from "./ui/input";

function amountText(value: number) {
  return value ? value.toFixed(2) : "";
}

function looksLikeAmount(raw: string) {
  return raw === "" || /^-?\d*\.?\d{0,2}$/.test(raw);
}

function parseTyping(raw: string) {
  if (raw === "" || raw === "-" || raw === "." || raw === "-.") return 0;
  return Number(raw);
}

/** Keep the typed decimal on iPhone; Number("12.") was wiping the dot. */
export function AmountInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [text, setText] = useState(() => amountText(value));

  useEffect(() => {
    const typed = parseTyping(text);
    if (typed === value) return;
    setText(amountText(value));
  }, [value, text]);

  return (
    <Input
      inputMode="decimal"
      enterKeyHint="done"
      autoComplete="off"
      autoCorrect="off"
      value={text}
      placeholder="0.00"
      onChange={(e) => {
        const raw = e.target.value.replace(/,/g, ".");
        if (!looksLikeAmount(raw)) return;
        setText(raw);
        onChange(parseTyping(raw));
      }}
      onBlur={() => {
        const n = parseTyping(text);
        if (!Number.isFinite(n) || text === "" || text === "-" || text === "." || text === "-.") {
          setText("");
          onChange(0);
          return;
        }
        setText(n.toFixed(2));
        onChange(n);
      }}
    />
  );
}
