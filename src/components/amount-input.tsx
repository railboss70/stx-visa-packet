import { useState } from "react";
import { Input } from "./ui/input";

/** Keep the typed decimal on iPhone; Number("12.") was wiping the dot. */
export function AmountInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [text, setText] = useState(() => (value ? value.toFixed(2) : ""));

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
        if (raw !== "" && !/^\d*\.?\d{0,2}$/.test(raw)) return;
        setText(raw);
        if (raw === "" || raw === ".") onChange(0);
        else onChange(Number(raw));
      }}
      onBlur={() => {
        if (text === "" || text === ".") {
          setText("");
          onChange(0);
          return;
        }
        const n = Number(text);
        if (!Number.isFinite(n)) return;
        setText(n.toFixed(2));
        onChange(n);
      }}
    />
  );
}
