import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { atualizarRelatorio, getInsumos, getRelatorio } from "@/lib/contagem.functions";
import { formatarDataHora, formatarQuantidade } from "@/lib/contagem-model";
import { CampoQuantidade } from "@/components/CampoQuantidade";
import { normalizar } from "@/lib/texto";

export const Route = createFileRoute("/relatorios/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe do relatório — Cozinha Leo Chopp" },
      {
        name: "description",
        content: "Itens e quantidades lançados nesta contagem de insumos, com opção de edição.",
      },
      { property: "og:title", content: "Detalhe do relatório — Cozinha Leo Chopp" },
      {
        property: "og:description",
        content: "Veja os insumos lançados nesta contagem e edite se necessário.",
      },
    ],
  }),
  component: DetalheRelatorio,
});

function DetalheRelatorio() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchRelatorio = useServerFn(getRelatorio);
  const fetchInsumos = useServerFn(getInsumos);
  const salvar = useServerFn(atualizarRelatorio);

  const { data, isLoading, error } = useQuery({
    queryKey: ["relatorio", id],
    queryFn: () => fetchRelatorio({ data: { id } }),
  });
  const { data: dadosInsumos } = useQuery({
    queryKey: ["insumos"],
    queryFn: () => fetchInsumos(),
  });

  const [editando, setEditando] = useState(false);
  const [perguntar, setPerguntar] = useState(false);
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [quantidades, setQuantidades] = useState<Record<number, number>>({});
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (!data) return;
    setResponsavel(data.relatorio.responsavel);
    setObservacoes(data.relatorio.observacoes);
    setQuantidades(Object.fromEntries(data.itens.map((i) => [i.row, i.quantidade])));
  }, [data]);

  const insumos = dadosInsumos?.insumos ?? [];
  const filtrados = useMemo(() => {
    const q = normalizar(busca.trim());
    if (!q) return insumos;
    return insumos.filter(
      (i) => normalizar(i.nome).includes(q) || normalizar(i.grupo).includes(q),
    );
  }, [insumos, busca]);

  const mutation = useMutation({
    mutationFn: () =>
      salvar({
        data: {
          id,
          responsavel,
          observacoes,
          itens: Object.entries(quantidades).map(([row, quantidade]) => ({
            row: Number(row),
            quantidade,
          })),
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["relatorio", id] });
      await queryClient.invalidateQueries({ queryKey: ["relatorios"] });
      setEditando(false);
    },
  });

  const relatorio = data?.relatorio;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/relatorios" className="text-sm text-muted-foreground">
            ← Relatórios
          </Link>
          <h1 className="mt-1 truncate text-2xl font-extrabold tracking-tight">
            {relatorio ? formatarDataHora(relatorio.data) : "Relatório"}
          </h1>
          {relatorio && (
            <p className="text-sm text-muted-foreground">Responsável: {relatorio.responsavel}</p>
          )}
        </div>
        {relatorio && !relatorio.excluido && !editando && (
          <button
            onClick={() => setPerguntar(true)}
            className="shrink-0 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold"
          >
            Editar
          </button>
        )}
        {editando && (
          <button
            disabled={mutation.isPending || !responsavel.trim()}
            onClick={() => mutation.mutate()}
            className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
          >
            {mutation.isPending ? "Salvando…" : "Salvar"}
          </button>
        )}
      </header>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Carregando…</p>}
      {error && (
        <p className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {(error as Error).message}
        </p>
      )}

      {relatorio?.excluido && (
        <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          Relatório excluído — os valores foram removidos da planilha base.
        </p>
      )}
      {relatorio?.editado && !relatorio.excluido && (
        <p className="mt-4 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
          Editado por {relatorio.editadoPor || relatorio.responsavel} em{" "}
          {formatarDataHora(relatorio.editadoEm)}
        </p>
      )}

      {editando ? (
        <>
          <section className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Responsável
              </span>
              <input
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-secondary px-3 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Observações da edição
              </span>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
                className="mt-1 w-full resize-none rounded-xl border border-input bg-secondary px-3 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </section>

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar insumo…"
            className="mt-4 w-full rounded-xl border border-input bg-secondary px-3 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
          />

          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {filtrados.map((insumo) => (
              <li key={insumo.row} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-sm font-medium">
                  {insumo.nome}
                  <span className="ml-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {insumo.grupo}
                  </span>
                </span>
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

          {mutation.error && (
            <p className="mt-3 text-sm text-destructive">{(mutation.error as Error).message}</p>
          )}
          <button
            onClick={() => setEditando(false)}
            className="mt-4 w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold"
          >
            Cancelar edição
          </button>
        </>
      ) : (
        <>
          {relatorio?.observacoes && (
            <p className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm">
              <span className="text-muted-foreground">Observações:</span> {relatorio.observacoes}
            </p>
          )}
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {(data?.itens ?? []).map((item, i) => (
              <li
                key={`${item.row}-${i}`}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="text-sm font-medium">
                  {item.nome}
                  {item.grupo && (
                    <span className="ml-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {item.grupo}
                    </span>
                  )}
                </span>
                <span className="text-base font-bold text-accent">
                  {formatarQuantidade(item.quantidade)}
                </span>
              </li>
            ))}
          </ul>
          {!isLoading && (data?.itens ?? []).length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">Nenhum item lançado.</p>
          )}
        </>
      )}

      {perguntar && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold">Editar este relatório?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ele será reaberto para edição. Ao salvar, a planilha base é atualizada e o relatório
              fica marcado como editado, com responsável e data.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setPerguntar(false)}
                className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold"
              >
                Não
              </button>
              <button
                onClick={() => {
                  setEditando(true);
                  setPerguntar(false);
                }}
                className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
              >
                Sim, editar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
