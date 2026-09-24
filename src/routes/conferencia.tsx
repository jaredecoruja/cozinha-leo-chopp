import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getConferencia } from "@/lib/contagem.functions";
import { formatarDataHora } from "@/lib/contagem-model";

export const Route = createFileRoute("/conferencia")({
  head: () => ({
    meta: [
      { title: "Conferência — Cozinha Leo Chopp" },
      { name: "description", content: "Espelho ao vivo da aba de conferência da planilha da cozinha." },
      { property: "og:title", content: "Conferência — Cozinha Leo Chopp" },
      { property: "og:description", content: "Confira casa, consumer e sobras e faltas linha a linha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Conferencia,
});

const CHAVE_OK = "conferencia-ok";

function Conferencia() {
  const fetchConf = useServerFn(getConferencia);
  const { data, isLoading, error } = useQuery({
    queryKey: ["conferencia"],
    queryFn: () => fetchConf(),
    refetchInterval: 20_000,
  });
  const [ok, setOk] = useState<Record<number, boolean>>({});
  useEffect(() => {
    try {
      setOk(JSON.parse(localStorage.getItem(CHAVE_OK) ?? "{}"));
    } catch {}
  }, []);
  const alternar = (row: number) =>
    setOk((a) => {
      const p = { ...a, [row]: !a[row] };
      localStorage.setItem(CHAVE_OK, JSON.stringify(p));
      return p;
    });

  const linhas = data?.linhas ?? [];
  const [cab, ...corpo] = linhas;

  return (
    <main className="mx-auto w-full max-w-3xl px-2 py-3">
      <header className="mb-2 flex items-center justify-between gap-2">
        <Link to="/relatorios" className="text-sm font-semibold text-muted-foreground">
          ← Voltar
        </Link>
        <h1 className="text-lg font-extrabold">Conferência</h1>
        <button
          onClick={() => {
            setOk({});
            localStorage.removeItem(CHAVE_OK);
          }}
          className="rounded-lg border border-border px-2 py-1 text-xs font-semibold"
        >
          Limpar OK
        </button>
      </header>
      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {cab && (
        <table className="w-full table-fixed border-collapse text-[11px] leading-tight sm:text-xs">
          <colgroup>
            <col className="w-[13%]" />
            <col />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[44px]" />
          </colgroup>
          <thead>
            <tr>
              {cab.celulas.map((c, k) => (
                <th key={k} className="border border-neutral-400 px-1 py-1 text-center font-bold" style={{ background: c.bg, color: c.fg }}>
                  {c.t}
                </th>
              ))}
              <th className="border border-neutral-400 bg-card px-1 py-1">OK</th>
            </tr>
          </thead>
          <tbody>
            {corpo.map((l) => (
              <tr key={l.row} className={ok[l.row] ? "opacity-50" : ""}>
                {l.celulas.map((c, k) => (
                  <td
                    key={k}
                    className={`border border-neutral-400 px-1 py-0.5 ${k === 1 ? "truncate text-left" : "text-center"}`}
                    style={{ background: c.bg, color: c.fg, fontWeight: c.b ? 700 : 400 }}
                    title={c.t}
                  >
                    {c.t}
                  </td>
                ))}
                <td className="border border-neutral-400 bg-card p-0.5 text-center">
                  <button
                    onClick={() => alternar(l.row)}
                    className={`w-full rounded px-1 py-0.5 text-[10px] font-bold ${ok[l.row] ? "bg-primary text-primary-foreground" : "border border-border"}`}
                  >
                    {ok[l.row] ? "✓" : "OK"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data && (
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Atualiza a cada 20 s · última leitura {formatarDataHora(data.atualizado)}
        </p>
      )}
    </main>
  );
}
