import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { getConferencia } from "@/lib/contagem.functions";
import { formatarDataHora } from "@/lib/contagem-model";

export const Route = createFileRoute("/conferencia")({
  head: () => ({
    meta: [
      { title: "Conferência — Cozinha Leo Chopp" },
      { name: "description", content: "Conferência de casa, consumer e sobras e faltas." },
      { property: "og:title", content: "Conferência — Cozinha Leo Chopp" },
      { property: "og:description", content: "Confira os itens e suas diferenças de estoque." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Conferencia,
});

const CHAVE_OK = "conferencia-ok";
const CHAVE_OBSERVACOES = "conferencia-observacoes";

function Conferencia() {
  const fetchConf = useServerFn(getConferencia);
  const { data, isLoading, error } = useQuery({
    queryKey: ["conferencia"],
    queryFn: () => fetchConf(),
    refetchInterval: 20_000,
  });
  const [ok, setOk] = useState<Record<number, boolean>>({});
  const [caldinhoAberto, setCaldinhoAberto] = useState<number | null>(null);
  const [observacoes, setObservacoes] = useState<Record<number, string>>({});
  const [observacaoAberta, setObservacaoAberta] = useState<number | null>(null);
  const [rascunhoObservacao, setRascunhoObservacao] = useState("");
  const observacaoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      setOk(JSON.parse(localStorage.getItem(CHAVE_OK) ?? "{}"));
      setObservacoes(JSON.parse(localStorage.getItem(CHAVE_OBSERVACOES) ?? "{}"));
    } catch {}
  }, []);

  useEffect(() => {
    if (observacaoAberta === null) return;
    const fecharAoClicarFora = (evento: PointerEvent) => {
      if (observacaoRef.current && !observacaoRef.current.contains(evento.target as Node)) {
        setObservacaoAberta(null);
      }
    };
    document.addEventListener("pointerdown", fecharAoClicarFora);
    return () => document.removeEventListener("pointerdown", fecharAoClicarFora);
  }, [observacaoAberta]);

  const abrirObservacao = (row: number) => {
    setRascunhoObservacao(observacoes[row] ?? "");
    setObservacaoAberta(row);
  };

  const salvarObservacao = (row: number) => {
    setObservacoes((atuais) => {
      const novas = { ...atuais, [row]: rascunhoObservacao };
      localStorage.setItem(CHAVE_OBSERVACOES, JSON.stringify(novas));
      return novas;
    });
  };

  const limparObservacao = (row: number) => {
    setObservacoes((atuais) => {
      const novas = { ...atuais };
      delete novas[row];
      localStorage.setItem(CHAVE_OBSERVACOES, JSON.stringify(novas));
      return novas;
    });
    setRascunhoObservacao("");
  };
  const alternar = (row: number) =>
    setOk((a) => {
      const p = { ...a, [row]: !a[row] };
      localStorage.setItem(CHAVE_OK, JSON.stringify(p));
      return p;
    });

  const linhas = data?.linhas ?? [];
  const [cab, ...corpo] = linhas;
  const totalOk = corpo.filter((l) => ok[l.row]).length;

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-5">
      <header className="mb-5 flex items-center justify-between gap-3">
        <Link to="/relatorios" className="shrink-0 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
          ← Voltar
        </Link>
        <div className="min-w-0 text-center">
          <h1 className="text-xl font-extrabold tracking-tight">Conferência</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Acompanhamento dos itens</p>
        </div>
        <button
          onClick={() => {
            setOk({});
            localStorage.removeItem(CHAVE_OK);
          }}
          className="shrink-0 rounded-lg border border-border bg-white px-2.5 py-2 text-xs font-semibold transition-colors hover:bg-muted"
        >
          Limpar OK
        </button>
      </header>

      {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Carregando conferência…</p>}
      {error && <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{(error as Error).message}</p>}

      {cab && (
        <>
          <div className="mb-3 flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
            <span className="text-xs font-medium text-muted-foreground">Itens conferidos</span>
            <span className="text-sm font-bold tabular-nums">{totalOk} <span className="font-medium text-muted-foreground">/ {corpo.length}</span></span>
          </div>

          <section className="space-y-2.5" aria-label="Itens da conferência">
            {corpo.map((l) => {
              const produto = l.celulas[1];
              const valores = [0, 2, 3];
              return (
                <article
                  key={l.row}
                  className={`rounded-xl border border-border bg-white p-3 shadow-sm transition-opacity sm:p-4 ${ok[l.row] ? "opacity-50" : ""}`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {cab.celulas[1]?.t ?? "Item"}
                      </p>
                      <div ref={observacaoAberta === l.row ? observacaoRef : undefined} className="min-w-0">
                        <button
                          type="button"
                          onClick={() => observacaoAberta === l.row ? setObservacaoAberta(null) : abrirObservacao(l.row)}
                          aria-expanded={observacaoAberta === l.row}
                          className="break-words text-left text-sm font-extrabold leading-snug text-foreground underline decoration-dotted underline-offset-4 sm:text-base"
                          style={{ color: produto?.fg }}
                        >
                          {produto?.t}
                        </button>
                        {observacaoAberta === l.row && (
                          <div className="mt-2 rounded-lg border border-border bg-neutral-50 p-3">
                            <label htmlFor={`observacao-${l.row}`} className="mb-1.5 block text-xs font-bold text-foreground">
                              Observações
                            </label>
                            <textarea
                              id={`observacao-${l.row}`}
                              value={rascunhoObservacao}
                              onChange={(evento) => setRascunhoObservacao(evento.target.value)}
                              placeholder="Escreva uma observação sobre este item..."
                              rows={3}
                              className="w-full resize-y rounded-md border border-border bg-white p-2 text-sm text-foreground outline-none focus:border-neutral-500"
                            />
                            <div className="mt-2 flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => limparObservacao(l.row)}
                                className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                              >
                                Limpar
                              </button>
                              <button
                                type="button"
                                onClick={() => salvarObservacao(l.row)}
                                className="rounded-md bg-black px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        )}
                        {observacaoAberta !== l.row && observacoes[l.row]?.trim() && (
                          <p className="mt-1 text-[10px] font-medium text-muted-foreground">Observação salva</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => alternar(l.row)}
                      aria-pressed={!!ok[l.row]}
                      className={`flex h-9 min-w-[62px] shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors ${ok[l.row] ? "bg-green-600 text-white" : "border border-border bg-white text-foreground hover:bg-muted"}`}
                    >
                      {ok[l.row] ? "✓ OK" : "OK"}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {valores.map((k) => {
                      const celula = l.celulas[k];
                      const ehCaldinho = (produto?.t ?? "").toLocaleUpperCase("pt-BR").includes("CALDINHO");
                      const valorCasa = k === 0 && ehCaldinho
                        ? Number(String(celula?.t ?? "").trim().replace(/\\./g, "").replace(",", "."))
                        : NaN;
                      const baldes = Number.isFinite(valorCasa) && valorCasa >= 0 ? Math.floor(valorCasa / 3) : 0;
                      const restanteMl = Number.isFinite(valorCasa) && valorCasa >= 0
                        ? Math.round((valorCasa - baldes * 3) * 1000)
                        : 0;
                      return (
                        <div key={k} className="min-w-0 rounded-lg bg-neutral-50 px-2 py-2 text-center">
                          <p
                            className={`mb-1 flex min-h-7 w-full items-center justify-center rounded-md px-1 text-[9px] font-bold uppercase leading-tight tracking-wide sm:text-[10px] ${k === 2 ? "" : "text-muted-foreground"}`}
                            style={k === 2 ? { backgroundColor: celula?.bg, color: celula?.fg } : undefined}
                          >
                            {cab.celulas[k]?.t}
                          </p>
                          {ehCaldinho && k === 0 ? (
                            <button
                              type="button"
                              onClick={() => setCaldinhoAberto((atual) => atual === l.row ? null : l.row)}
                              aria-expanded={caldinhoAberto === l.row}
                              title="Ver quantidade em baldes de 3 litros"
                              className="flex min-h-10 w-full items-center justify-center rounded-md px-2 py-2 text-sm font-extrabold tabular-nums underline decoration-dotted underline-offset-4 transition-opacity hover:opacity-80 sm:text-base"
                              style={{ backgroundColor: celula?.bg, color: celula?.fg }}
                            >
                              {celula?.t}
                            </button>
                          ) : (
                            <p
                              className="flex min-h-10 w-full items-center justify-center rounded-md px-2 py-2 text-sm font-extrabold tabular-nums sm:text-base"
                              style={{ backgroundColor: k === 2 ? undefined : celula?.bg, color: celula?.fg }}
                            >
                              {celula?.t}
                            </p>
                          )}
                          {ehCaldinho && k === 0 && caldinhoAberto === l.row && (
                            <div className="mt-2 rounded-md border border-black/10 bg-white px-2 py-2 text-xs text-foreground">
                              {Number.isFinite(valorCasa) && valorCasa >= 0 ? (
                                <>
                                  <p className="font-bold">{baldes} {baldes === 1 ? "balde" : "baldes"} de 3 L</p>
                                  <p className="mt-0.5 text-muted-foreground">+ {(restanteMl / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L restantes</p>
                                </>
                              ) : (
                                <p className="text-muted-foreground">Valor não numérico para conversão.</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}

      {data && (
        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          Atualiza a cada 20 s · última leitura {formatarDataHora(data.atualizado)}
        </p>
      )}
    </main>
  );
}
