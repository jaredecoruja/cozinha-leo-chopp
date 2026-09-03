// Modelo compartilhado (seguro para o navegador) da planilha "LANÇAMENTOS COZINHA".

export const ABA_CONTAGEM = "CONTAGEM";
export const ABA_RELATORIOS = "RELATORIOS_APP";

/** Primeira coluna de lançamento (C) em índice 0-based. */
export const PRIMEIRA_COLUNA = 2;
/** Última linha considerada na aba CONTAGEM. */
export const ULTIMA_LINHA = 60;

/** Fuso da planilha (America/Sao_Paulo). */
const OFFSET_MIN = -180;

export function letraColuna(indice: number): string {
  let n = indice;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

export function indiceColuna(letra: string): number {
  let n = 0;
  for (const c of letra.toUpperCase()) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

export function paraSerial(d: Date): number {
  return (d.getTime() + OFFSET_MIN * 60_000) / 86_400_000 + 25569;
}

export function deSerial(n: number): Date {
  return new Date(Math.round((n - 25569) * 86_400_000) - OFFSET_MIN * 60_000);
}

/** Aceita serial da planilha, ISO ou vazio e devolve ISO string. */
export function paraIso(valor: unknown): string {
  if (typeof valor === "number" && Number.isFinite(valor)) return deSerial(valor).toISOString();
  if (typeof valor === "string" && valor.trim() !== "") {
    const d = new Date(valor);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return "";
}

/** Texto dd/mm/aaaa hh:mm no fuso da planilha — o Sheets grava como data de verdade. */
export function paraTextoPlanilha(d: Date): string {
  const p = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(",", "");
  return p;
}

export function formatarQuantidade(n: number): string {
  return String(n).replace(".", ",");
}

export function formatarDataHora(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type InsumoDTO = { row: number; nome: string; grupo: string };

export type ItemRelatorioDTO = { row: number; nome: string; grupo: string; quantidade: number };

export type RelatorioDTO = {
  id: string;
  data: string;
  responsavel: string;
  observacoes: string;
  coluna: string;
  resumo: string;
  editado: boolean;
  editadoEm: string;
  editadoPor: string;
  excluido: boolean;
};

export const CHAVE_ADM_PLACEHOLDER = "••••";
