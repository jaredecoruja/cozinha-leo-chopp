import { createServerFn } from "@tanstack/react-start";
import {
  ABA_CONTAGEM,
  ABA_RELATORIOS,
  PRIMEIRA_COLUNA,
  ULTIMA_LINHA,
  letraColuna,
  paraTextoPlanilha,
  paraIso,
  formatarQuantidade,
  type InsumoDTO,
  type ItemRelatorioDTO,
  type RelatorioDTO,
} from "./contagem-model";

export type { InsumoDTO, ItemRelatorioDTO, RelatorioDTO };

const CHAVE_ADM = "0000";

type Celula = string | number;

function texto(v: Celula | undefined): string {
  return v === undefined || v === null ? "" : String(v);
}

function numero(v: Celula | undefined): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function lerInsumosDeValores(valores: Celula[][]): InsumoDTO[] {
  const insumos: InsumoDTO[] = [];
  let grupo = "";
  for (let i = 0; i < valores.length; i++) {
    const linha = valores[i] ?? [];
    const a = texto(linha[0]).trim();
    const b = texto(linha[1]).trim();
    if (a) grupo = a;
    if (i + 1 < 4 || !b) continue;
    insumos.push({ row: i + 1, nome: b, grupo });
  }
  return insumos;
}

function mapearRelatorio(linha: Celula[]): RelatorioDTO {
  const status = texto(linha[8]).trim().toUpperCase();
  const editadoEm = paraIso(linha[6]);
  return {
    id: texto(linha[0]).trim(),
    data: paraIso(linha[1]),
    responsavel: texto(linha[2]),
    observacoes: texto(linha[3]),
    coluna: texto(linha[4]).trim(),
    resumo: texto(linha[5]),
    editado: status === "EDITADO" || editadoEm !== "",
    editadoEm,
    editadoPor: texto(linha[7]),
    excluido: status === "EXCLUIDO" || status === "EXCLUÍDO",
  };
}

function montarResumo(itens: { nome: string; quantidade: number }[]): string {
  return itens.map((i) => `${i.nome}: ${formatarQuantidade(i.quantidade)}`).join(" | ");
}

/** Usa a data escolhida (YYYY-MM-DD) mantendo a hora atual; sem data, usa agora. */
function dataEscolhida(iso?: string): Date {
  const agora = new Date();
  if (!iso) return agora;
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return agora;
  return new Date(
    Date.UTC(a, m - 1, d, agora.getUTCHours(), agora.getUTCMinutes(), agora.getUTCSeconds()),
  );
}


export const getInsumos = createServerFn({ method: "GET" }).handler(async () => {
  const { lerFaixa } = await import("./contagem.server");
  const valores = await lerFaixa(`${ABA_CONTAGEM}!A1:B${ULTIMA_LINHA}`);
  return { insumos: lerInsumosDeValores(valores) };
});

export const getRelatorios = createServerFn({ method: "GET" }).handler(async () => {
  const { lerFaixa } = await import("./contagem.server");
  const valores = await lerFaixa(`${ABA_RELATORIOS}!A2:I1000`);
  const relatorios = valores
    .map(mapearRelatorio)
    .filter((r) => r.id !== "")
    .reverse();
  return { relatorios };
});

export const criarRelatorio = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      responsavel: string;
      observacoes: string;
      dataContagem?: string;
      itens: { row: number; quantidade: number }[];
    }) => {
      if (!input.responsavel?.trim()) throw new Error("Informe o responsável.");
      if (!input.itens?.length) throw new Error("Lance ao menos um item.");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const { lerFaixas, escreverFaixas, acrescentarLinha } = await import("./contagem.server");
    const [linhaCabecalho, valoresInsumos, linhasRelatorios] = await lerFaixas([
      `${ABA_CONTAGEM}!1:1`,
      `${ABA_CONTAGEM}!A1:B${ULTIMA_LINHA}`,
      `${ABA_RELATORIOS}!A2:I1000`,
    ]);

    const cabecalho = linhaCabecalho?.[0] ?? [];
    const usadas = new Set(
      (linhasRelatorios ?? [])
        .map(mapearRelatorio)
        .filter((r) => r.id && !r.excluido && r.coluna)
        .map((r) => r.coluna),
    );

    let indice = PRIMEIRA_COLUNA;
    while (texto(cabecalho[indice]).trim() !== "" || usadas.has(letraColuna(indice))) indice++;
    const letra = letraColuna(indice);

    const insumos = lerInsumosDeValores(valoresInsumos ?? []);
    const porRow = new Map(insumos.map((i) => [i.row, i]));
    const quantidades = new Map(data.itens.map((i) => [i.row, i.quantidade]));

    const agora = dataEscolhida(data.dataContagem);
    const coluna: Celula[][] = [];
    for (let linha = 1; linha <= ULTIMA_LINHA; linha++) {
      if (linha === 1) coluna.push([paraTextoPlanilha(agora)]);

      else {
        const q = quantidades.get(linha);
        coluna.push([q === undefined ? "" : q]);
      }
    }

    const lancados = data.itens
      .filter((i) => porRow.has(i.row))
      .map((i) => ({ nome: porRow.get(i.row)!.nome, quantidade: i.quantidade }));

    const id = `REL-${Date.now()}`;
    await escreverFaixas([
      { range: `${ABA_CONTAGEM}!${letra}1:${letra}${ULTIMA_LINHA}`, values: coluna },
    ]);
    await acrescentarLinha(`${ABA_RELATORIOS}!A1`, [
      id,
      paraTextoPlanilha(agora),
      data.responsavel.trim(),
      data.observacoes ?? "",
      letra,
      montarResumo(lancados),
    ]);

    return { id, coluna: letra };
  });

export const getRelatorio = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const { lerFaixas, lerFaixa } = await import("./contagem.server");
    const linhas = await lerFaixa(`${ABA_RELATORIOS}!A2:I1000`);
    const indiceLinha = linhas.findIndex((l) => texto(l[0]).trim() === data.id);
    if (indiceLinha === -1) throw new Error("Relatório não encontrado.");
    const relatorio = mapearRelatorio(linhas[indiceLinha] ?? []);
    const linhaPlanilha = indiceLinha + 2;

    const faixas = [`${ABA_CONTAGEM}!A1:B${ULTIMA_LINHA}`];
    if (!relatorio.excluido && relatorio.coluna) {
      faixas.push(
        `${ABA_CONTAGEM}!${relatorio.coluna}1:${relatorio.coluna}${ULTIMA_LINHA}`,
      );
    }
    const lidas = await lerFaixas(faixas);
    const insumos = lerInsumosDeValores(lidas[0] ?? []);
    const valoresColuna = lidas[1] ?? [];

    const itens: ItemRelatorioDTO[] = [];
    if (relatorio.excluido || !relatorio.coluna) {
      // Relatório excluído: preserva o resumo textual registrado.
      for (const parte of relatorio.resumo.split("|")) {
        const [nome, qtd] = parte.split(":");
        if (!nome || qtd === undefined) continue;
        const insumo = insumos.find((i) => i.nome.trim() === nome.trim());
        itens.push({
          row: insumo?.row ?? 0,
          nome: nome.trim(),
          grupo: insumo?.grupo ?? "",
          quantidade: Number(qtd.replace(",", ".").trim()) || 0,
        });
      }
    } else {
      for (const insumo of insumos) {
        const q = numero(valoresColuna[insumo.row - 1]?.[0]);
        if (q === null) continue;
        itens.push({ ...insumo, quantidade: q });
      }
    }

    return { relatorio, itens, linhaPlanilha };
  });

export const atualizarRelatorio = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id: string;
      responsavel: string;
      observacoes: string;
      itens: { row: number; quantidade: number }[];
    }) => {
      if (!input.responsavel?.trim()) throw new Error("Informe o responsável.");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const { lerFaixas, escreverFaixas } = await import("./contagem.server");
    const [linhas, valoresInsumos] = await lerFaixas([
      `${ABA_RELATORIOS}!A2:I1000`,
      `${ABA_CONTAGEM}!A1:B${ULTIMA_LINHA}`,
    ]);
    const indiceLinha = (linhas ?? []).findIndex((l) => texto(l[0]).trim() === data.id);
    if (indiceLinha === -1) throw new Error("Relatório não encontrado.");
    const relatorio = mapearRelatorio(linhas?.[indiceLinha] ?? []);
    if (relatorio.excluido) throw new Error("Relatório excluído não pode ser editado.");
    const linhaPlanilha = indiceLinha + 2;

    const insumos = lerInsumosDeValores(valoresInsumos ?? []);
    const porRow = new Map(insumos.map((i) => [i.row, i]));
    const quantidades = new Map(data.itens.map((i) => [i.row, i.quantidade]));

    const coluna: Celula[][] = [];
    for (let linha = 2; linha <= ULTIMA_LINHA; linha++) {
      const q = quantidades.get(linha);
      coluna.push([q === undefined ? "" : q]);
    }

    const lancados = data.itens
      .filter((i) => porRow.has(i.row))
      .map((i) => ({ nome: porRow.get(i.row)!.nome, quantidade: i.quantidade }));

    const agora = new Date();
    await escreverFaixas([
      { range: `${ABA_CONTAGEM}!${relatorio.coluna}2:${relatorio.coluna}${ULTIMA_LINHA}`, values: coluna },
      {
        range: `${ABA_RELATORIOS}!C${linhaPlanilha}:I${linhaPlanilha}`,
        values: [
          [
            data.responsavel.trim(),
            data.observacoes ?? "",
            relatorio.coluna,
            montarResumo(lancados),
            paraTextoPlanilha(agora),
            data.responsavel.trim(),
            "EDITADO",
          ],
        ],
      },
    ]);

    return { ok: true, editadoEm: agora.toISOString() };
  });

export const excluirRelatorios = createServerFn({ method: "POST" })
  .inputValidator((input: { chave: string; ids: string[] }) => {
    if (input.chave !== CHAVE_ADM) throw new Error("Chave de acesso inválida.");
    if (!input.ids?.length) throw new Error("Selecione ao menos um relatório.");
    return input;
  })
  .handler(async ({ data }) => {
    const { lerFaixa, escreverFaixas } = await import("./contagem.server");
    const linhas = await lerFaixa(`${ABA_RELATORIOS}!A2:I1000`);

    const escritas: { range: string; values: Celula[][] }[] = [];
    let excluidos = 0;
    for (let i = 0; i < linhas.length; i++) {
      const relatorio = mapearRelatorio(linhas[i] ?? []);
      if (!data.ids.includes(relatorio.id) || relatorio.excluido) continue;
      const linhaPlanilha = i + 2;
      if (relatorio.coluna) {
        const vazio: Celula[][] = [];
        for (let l = 1; l <= ULTIMA_LINHA; l++) vazio.push([""]);
        escritas.push({
          range: `${ABA_CONTAGEM}!${relatorio.coluna}1:${relatorio.coluna}${ULTIMA_LINHA}`,
          values: vazio,
        });
      }
      escritas.push({
        range: `${ABA_RELATORIOS}!E${linhaPlanilha}:I${linhaPlanilha}`,
        values: [[
          "",
          relatorio.resumo,
          texto(linhas[i]?.[6]),
          texto(linhas[i]?.[7]),
          "EXCLUIDO",
        ]],
      });
      excluidos++;
    }

    if (escritas.length) await escreverFaixas(escritas);
    return { excluidos };
  });

export const validarChaveAdm = createServerFn({ method: "POST" })
  .inputValidator((input: { chave: string }) => input)
  .handler(async ({ data }) => ({ ok: data.chave === CHAVE_ADM }));
