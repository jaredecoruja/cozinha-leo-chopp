import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { criarRelatorio, getInsumos } from "@/lib/contagem.functions";
import { CampoQuantidade } from "@/components/CampoQuantidade";
import { normalizar } from "@/lib/texto";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cozinha Leo Chopp — Contagem de insumos" },
      {
        name: "description",
        content:
          "Lance a contagem diária de insumos da cozinha e envie direto para a planilha base.",
      },
      { property: "og:title", content: "Cozinha Leo Chopp" },
      {
        property: "og:description",
        content: "Contagem rápida de insumos com envio automático para a planilha.",
      },
    ],
  }),
  component: Contagem,
});

function Contagem() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchInsumos = useServerFn(getInsumos);
  const enviar = useServerFn(criarRelatorio);

  const { data, isLoading, error } = useQuery({
    queryKey: ["insumos"],
    queryFn: () => fetchInsumos(),
  });

  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const [responsavel, setResponsavel] = useState("");
  const [dataContagem, setDataContagem] = useState(hoje);
  const [observacoes, setObservacoes] = useState("");
  const [busca, setBusca] = useState("");
  const [quantidades, setQuantidades] = useState<Record<number, number>>({});
  const [recolhidos, setRecolhidos] = useState<Record<string, boolean>>({});
  const [pedirChaveAdm, setPedirChaveAdm] = useState(false);
  const [chaveAdm, setChaveAdm] = useState("");
  const [erroChaveAdm, setErroChaveAdm] = useState<string | null>(null);

  const insumos = data?.insumos ?? [];
  const filtrados = useMemo(() => {
    const q = normalizar(busca.trim());
    if (!q) return insumos;
    return insumos.filter(
      (i) => normalizar(i.nome).includes(q) || normalizar(i.grupo).includes(q),
    );
  }, [insumos, busca]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, typeof filtrados>();
    for (const i of filtrados) {
      const lista = mapa.get(i.grupo) ?? [];
      lista.push(i);
      mapa.set(i.grupo, lista);
    }
    return [...mapa.entries()];
  }, [filtrados]);

  const lancados = Object.entries(quantidades).filter(([, v]) => v !== undefined);

  const mutation = useMutation({
    mutationFn: () =>
      enviar({
        data: {
          responsavel,
          observacoes,
          dataContagem,
          itens: lancados.map(([row, quantidade]) => ({ row: Number(row), quantidade })),
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["relatorios"] });
      setQuantidades({});
      setObservacoes("");
      navigate({ to: "/relatorios" });
    },
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Cozinha Leo Chopp
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Contagem de insumos
          </p>
        </div>
        <Link
          to="/relatorios"
          className="shrink-0 rounded-xl border border-black bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
        >
          Relatórios
        </Link>
      </header>

      <section className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Responsável
            </span>
            <input
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Seu nome"
              className="mt-1 w-full rounded-xl border border-input bg-secondary px-3 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Data
            </span>
            <input
              type="date"
              value={dataContagem}
              onChange={(e) => setDataContagem(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-secondary px-3 py-3 text-base text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Observações
          </span>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={2}
            placeholder="Opcional"
            className="mt-1 w-full resize-none rounded-xl border border-input bg-secondary px-3 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </label>
      </section>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar insumo…"
        className="mt-4 w-full rounded-xl border border-input bg-secondary px-3 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
      />

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Carregando insumos…</p>}
      {error && (
        <p className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">
          Não foi possível ler a planilha: {(error as Error).message}
        </p>
      )}

      <div className="mt-4 space-y-5">
        {grupos.map(([grupo, itens]) => {
          const aberto = !recolhidos[grupo];
          const lancadosGrupo = itens.filter((i) => quantidades[i.row] !== undefined).length;
          return (
            <section key={grupo}>
              <button
                type="button"
                aria-expanded={aberto}
                onClick={() => setRecolhidos((a) => ({ ...a, [grupo]: aberto }))}
                className="sticky top-0 z-10 -mx-4 flex w-[calc(100%+2rem)] items-center gap-2 border-y border-black bg-black px-4 py-3 text-left text-sm font-bold uppercase tracking-[0.12em] text-white shadow-sm transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <span className={`text-xs transition-transform ${aberto ? "rotate-90" : ""}`}>▶</span>
                <span className="min-w-0">{grupo}</span>
                <span className="ml-auto shrink-0 text-xs font-semibold normal-case tracking-normal text-white">
                  {lancadosGrupo > 0 ? `${lancadosGrupo} lançado(s) · ` : ""}
                  {itens.length} itens
                </span>
              </button>
              {aberto && (
                <ul className="divide-y divide-border overflow-hidden rounded-b-2xl border-x border-b border-border bg-card">
                  {itens.map((insumo) => (
                    <li
                      key={insumo.row}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <span className="text-sm font-semibold text-foreground">{insumo.nome}</span>
                      <CampoQuantidade
                        valor={quantidades[insumo.row]}
                        onChange={(v) =>
                          setQuantidades((atual) => {
                            const proximo = { ...atual };
                            if (v === null) delete proximo[insumo.row];
                            else proximo[insumo.row] = v;
                            return proximo;
                          })
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={() => {
            setPedirChaveAdm(true);
            setErroChaveAdm(null);
          }}
          aria-label="Acessar administração"
          className="rounded-full border border-border bg-card px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-colors hover:bg-secondary"
        >
          ADM
        </button>
      </div>

      {pedirChaveAdm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold">Acesso ADM</h2>
            <p className="mt-1 text-sm text-muted-foreground">Informe a chave de acesso.</p>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              value={chaveAdm}
              onChange={(e) => setChaveAdm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (chaveAdm !== "0000") return setErroChaveAdm("Chave inválida.");
                  sessionStorage.setItem("cozinha-leo-chopp-acesso-adm", "1");
                  navigate({ to: "/relatorios" });
                }
              }}
              className="mt-3 w-full rounded-xl border border-input bg-secondary px-3 py-3 text-center text-lg tracking-[0.5em] outline-none focus:ring-2 focus:ring-ring"
            />
            {erroChaveAdm && <p className="mt-2 text-sm text-destructive">{erroChaveAdm}</p>}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setPedirChaveAdm(false);
                  setChaveAdm("");
                }}
                className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (chaveAdm !== "0000") return setErroChaveAdm("Chave inválida.");
                  sessionStorage.setItem("cozinha-leo-chopp-acesso-adm", "1");
                  navigate({ to: "/relatorios" });
                }}
                className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
              >
                Entrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <span className="text-sm font-medium text-foreground">
            {lancados.length} {lancados.length === 1 ? "item" : "itens"}
          </span>
          <button
            disabled={mutation.isPending || !responsavel.trim() || lancados.length === 0}
            onClick={() => mutation.mutate()}
            className="ml-auto rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {mutation.isPending ? "Enviando…" : "Enviar contagem"}
          </button>
        </div>
        {mutation.error && (
          <p className="mx-auto mt-2 max-w-2xl text-sm text-destructive">
            {(mutation.error as Error).message}
          </p>
        )}
      </div>
    </main>
  );
}
