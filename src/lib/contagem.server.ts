// Acesso à planilha do Google via connector gateway. Somente servidor.

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

export const SPREADSHEET_ID = "119q9InJsgoOZ4E9gJoOGKtrtMhiR3-MvzNwGJHWCvj8";

function autenticacao(): Record<string, string> {
  const lovable = process.env["LOVABLE_API_KEY"];
  const conexao = process.env["GOOGLE_SHEETS_API_KEY"];
  if (!lovable || !conexao) {
    throw new Error("Conexão com o Google Sheets indisponível no servidor.");
  }
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": conexao,
    "Content-Type": "application/json",
  };
}

async function chamar(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: { ...autenticacao(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const corpo = await res.text();
    console.error(`Google Sheets falhou [${res.status}]: ${corpo}`);
    throw new Error(`Falha ao acessar a planilha [${res.status}]: ${corpo}`);
  }
  return res.json();
}

type Celula = string | number;

export async function lerFaixas(ranges: string[]): Promise<Celula[][][]> {
  const qs = ranges.map((r) => `ranges=${r}`).join("&");
  const json = (await chamar(
    `/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${qs}&valueRenderOption=UNFORMATTED_VALUE`,
  )) as { valueRanges?: { values?: Celula[][] }[] };
  return ranges.map((_, i) => json.valueRanges?.[i]?.values ?? []);
}

export async function lerFaixa(range: string): Promise<Celula[][]> {
  const [v] = await lerFaixas([range]);
  return v ?? [];
}

export async function escreverFaixas(dados: { range: string; values: Celula[][] }[]): Promise<void> {
  await chamar(`/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ valueInputOption: "USER_ENTERED", data: dados }),
  });
}

export async function acrescentarLinha(range: string, linha: Celula[]): Promise<void> {
  await chamar(
    `/spreadsheets/${SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: [linha] }) },
  );
}
