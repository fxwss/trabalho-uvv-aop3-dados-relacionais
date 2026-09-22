import { formatData } from "@precos/shared";
import type { ColunaConsulta, FormatoColuna } from "@precos/shared";

export type LinhaGenerica = Record<string, unknown>;

const escaparCampo = (valor: string): string => {
  if (/[";\r\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
};

/**
 * CSV pensado para abrir no Excel em pt-BR: separador `;` e decimal com virgula.
 * A API ainda prefixa o BOM para o Excel reconhecer o UTF-8.
 */
const formatarCampo = (valor: unknown, formato: FormatoColuna): string => {
  if (valor === null || valor === undefined) return "";
  if (formato === "moeda") return Number(valor).toFixed(3).replace(".", ",");
  if (formato === "data") return formatData(String(valor));
  if (formato === "numero") return String(Number(valor));
  return String(valor);
};

export const gerarCsv = (
  colunas: ColunaConsulta[],
  linhas: LinhaGenerica[],
): string => {
  const cabecalho = colunas
    .map((coluna) => escaparCampo(coluna.titulo))
    .join(";");
  const corpo = linhas.map((linha) =>
    colunas
      .map((coluna) =>
        escaparCampo(formatarCampo(linha[coluna.chave], coluna.formato)),
      )
      .join(";"),
  );
  return [cabecalho, ...corpo].join("\r\n");
};

export const BOM_UTF8 = "\uFEFF";
