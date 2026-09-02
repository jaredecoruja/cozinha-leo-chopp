import { useState } from "react";

export function CampoQuantidade({
  valor,
  onChange,
  disabled,
}: {
  valor: number | undefined;
  onChange: (v: number | null) => void;
  disabled?: boolean;
}) {
  const [texto, setTexto] = useState<string | null>(null);
  const exibido = texto ?? (valor === undefined ? "" : String(valor).replace(".", ","));

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label="Diminuir"
        disabled={disabled}
        onClick={() => {
          setTexto(null);
          onChange(Math.max(0, (valor ?? 0) - 1));
        }}
        className="size-9 rounded-lg border border-border bg-secondary text-lg font-bold disabled:opacity-40"
      >
        −
      </button>
      <input
        inputMode="decimal"
        disabled={disabled}
        value={exibido}
        onChange={(e) => {
          const bruto = e.target.value.replace(/[^\d.,]/g, "").replace(/\./g, ",");
          setTexto(bruto);
          if (bruto.trim() === "") return onChange(null);
          const n = Number(bruto.replace(",", "."));
          if (Number.isFinite(n)) onChange(n);
        }}
        onBlur={() => setTexto(null)}
        placeholder="—"
        className="w-16 rounded-lg border border-input bg-secondary py-2 text-center text-base outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
      />
      <button
        type="button"
        aria-label="Aumentar"
        disabled={disabled}
        onClick={() => {
          setTexto(null);
          onChange((valor ?? 0) + 1);
        }}
        className="size-9 rounded-lg border border-border bg-primary text-lg font-bold text-primary-foreground disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
