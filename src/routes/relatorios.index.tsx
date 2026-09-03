import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { excluirRelatorios, getRelatorios } from "@/lib/contagem.functions";
import { formatarDataHora } from "@/lib/contagem-model";

export const Route = createFileRoute("/relatorios/")({
  head: () => ({
    meta: [
      { title: "Relatórios enviados — Cozinha Leo Chopp" },
      {
        name: "description",
        content:
          "Histórico das contagens enviadas, com marcação de relatórios editados e excluídos.",
      },
      { property: "og:title", content: "Relatórios enviados — Cozinha Leo Chopp" },
      {
        property: "og:description",
        content: "Abra qualquer contagem enviada para ver os itens lançados e suas quantidades.",
      },
    ],
  }),
  component: ListaRelatorios,
});

function ListaRelatorios() {
  const queryClient = useQueryClient();
  const fetchRelatorios = useServerFn(getRelatorios);
  const excluir = useServerFn(excluirRelatorios);

  const { data, isLoading, error } = useQuery({
    queryKey: ["relatorios"],
    queryFn: () => fetchRelatorios(),
  });

  const [pedirChave, setPedirChave] = useState(false);
  const [chave, setChave] = useState("");
  const [erroChave, setErroChave] = useState<string | null>(null);
  const [modoAdm, setModoAdm] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [confirmar, setConfirmar] = useState(false);

  const relatorios = (data?.relatorios ?? []).filter((r) => !r.excluido);

  const mutation = useMutation({
    mutationFn: () => excluir({ data: { chave, ids: selecionados } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["relatorios"] });
      setSelecionados([]);
      setConfirmar(false);
    },
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"
          >
            ← Voltar ao início
          </Link>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Cozinha Leo Chopp
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Relatórios</h1>
        </div>
        <Link
          to="/"
          className="shrink-0 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold"
        >
          Nova contagem
        </Link>
      </header>


      {modoAdm && (
        <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <strong className="font-bold">Modo ADM ativo.</strong> Selecione relatórios e use a
          lixeira para excluir.
          <button
            onClick={() => {
              setModoAdm(false);
              setSelecionados([]);
              setChave("");
            }}
            className="ml-2 underline"
          >
            Sair
          </button>
        </div>
      )}

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Carregando relatórios…</p>}
      {error && (
        <p className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {(error as Error).message}
        </p>
      )}
      {!isLoading && relatorios.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">Nenhum relatório enviado ainda.</p>
      )}

      <ul className="mt-4 space-y-3">
        {relatorios.map((r) => (
          <li
            key={r.id}
            className={`rounded-2xl border border-border bg-card p-4 ${r.excluido ? "opacity-60" : ""}`}
          >
            <div className="flex items-start gap-3">
              {modoAdm && !r.excluido && (
                <input
                  type="checkbox"
                  aria-label={`Selecionar ${r.id}`}
                  checked={selecionados.includes(r.id)}
                  onChange={(e) =>
                    setSelecionados((atual) =>
                      e.target.checked ? [...atual, r.id] : atual.filter((x) => x !== r.id),
                    )
                  }
                  className="mt-1 size-5 accent-[var(--color-primary)]"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold">{formatarDataHora(r.data)}</span>
                  {r.editado && !r.excluido && (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-accent">
                      Editado
                    </span>
                  )}
                  {r.excluido && (
                    <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-destructive">
                      Excluído
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Responsável: {r.responsavel}</p>
                {r.editado && !r.excluido && (
                  <p className="text-xs text-muted-foreground">
                    Editado por {r.editadoPor || r.responsavel} em {formatarDataHora(r.editadoEm)}
                  </p>
                )}
                {r.observacoes && (
                  <p className="mt-1 text-sm">
                    <span className="text-muted-foreground">Obs.:</span> {r.observacoes}
                  </p>
                )}
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{r.resumo}</p>
                <Link
                  to="/relatorios/$id"
                  params={{ id: r.id }}
                  className="mt-3 inline-flex rounded-xl bg-secondary px-3 py-2 text-xs font-bold"
                >
                  Abrir relatório
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Botão ADM no canto inferior esquerdo */}
      {!modoAdm && (
        <button
          onClick={() => {
            setPedirChave(true);
            setErroChave(null);
          }}
          className="fixed bottom-4 left-4 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground"
        >
          ADM
        </button>
      )}

      {modoAdm && (
        <button
          disabled={selecionados.length === 0}
          onClick={() => setConfirmar(true)}
          aria-label="Excluir selecionados"
          className="fixed bottom-4 left-4 flex size-12 items-center justify-center rounded-2xl bg-destructive text-xl text-destructive-foreground disabled:opacity-40"
        >
          🗑
        </button>
      )}

      {pedirChave && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold">Acesso ADM</h2>
            <p className="mt-1 text-sm text-muted-foreground">Informe a chave de acesso.</p>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              className="mt-3 w-full rounded-xl border border-input bg-secondary px-3 py-3 text-center text-lg tracking-[0.5em] outline-none focus:ring-2 focus:ring-ring"
            />
            {erroChave && <p className="mt-2 text-sm text-destructive">{erroChave}</p>}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setPedirChave(false);
                  setChave("");
                }}
                className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (chave !== "0000") return setErroChave("Chave inválida.");
                  setModoAdm(true);
                  setPedirChave(false);
                  setErroChave(null);
                }}
                className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
              >
                Entrar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmar && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold">Excluir relatórios?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selecionados.length} selecionado(s). Os valores serão apagados da planilha base e o
              relatório ficará marcado como excluído.
            </p>
            {mutation.error && (
              <p className="mt-2 text-sm text-destructive">{(mutation.error as Error).message}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmar(false)}
                className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                className="flex-1 rounded-xl bg-destructive px-4 py-3 text-sm font-bold text-destructive-foreground disabled:opacity-50"
              >
                {mutation.isPending ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
