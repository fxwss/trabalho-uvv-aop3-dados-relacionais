import type { Catalogo, ColunaConsulta, ConsultaId } from "@precos/shared";

/** Em producao o nginx serve o site e faz proxy de /api para a API interna. */
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

export interface RespostaConsulta {
  consulta: {
    id: ConsultaId;
    requisito: string;
    titulo: string;
    descricao: string;
    arquivo: string;
    colunas: ColunaConsulta[];
    sql: string;
  };
  linhas: Record<string, unknown>[];
  total: number;
  geradoEm: string;
}

export type ParametrosConsulta = Record<string, string | number | undefined>;

export class ErroApi extends Error {
  readonly status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
  }
}

const montarQuery = (parametros: ParametrosConsulta): string => {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor === undefined || valor === "") continue;
    busca.set(chave, String(valor));
  }
  const query = busca.toString();
  return query ? `?${query}` : "";
};

const requisitar = async <TResposta>(
  caminho: string,
  parametros: ParametrosConsulta = {},
): Promise<TResposta> => {
  const resposta = await fetch(`${BASE}${caminho}${montarQuery(parametros)}`);

  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as {
      erro?: string;
    } | null;
    throw new ErroApi(
      corpo?.erro ??
        `Nao foi possivel carregar ${caminho} (HTTP ${resposta.status}).`,
      resposta.status,
    );
  }

  return (await resposta.json()) as TResposta;
};

export const buscarCatalogo = (): Promise<Catalogo> =>
  requisitar<Catalogo>("/catalogo");

export const buscarConsulta = (
  id: ConsultaId,
  parametros: ParametrosConsulta = {},
): Promise<RespostaConsulta> =>
  requisitar<RespostaConsulta>(`/consulta/${id}`, parametros);

/** URL de download de uma consulta, usada nos botoes de planilha. */
export const urlExportacao = (
  formato: "csv" | "xlsx",
  id: ConsultaId,
  parametros: ParametrosConsulta = {},
): string => `${BASE}/export/${formato}/${id}${montarQuery(parametros)}`;

export const urlPlanilhaCompleta = (): string =>
  `${BASE}/export/planilha-completa.xlsx`;
