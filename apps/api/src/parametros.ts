import type { ConsultaId } from "@precos/shared";

export interface ParametrosConsulta {
  parametros: (number | null)[];
  erro?: string;
}

const lerInteiro = (valor: string | undefined): number | null => {
  if (!valor) return null;
  const numero = Number(valor);
  return Number.isInteger(numero) ? numero : null;
};

/**
 * Traduz a query string para os parametros posicionais de cada consulta.
 * A consulta IV e a unica que exige posto e combustivel; `resumo-atual` nao usa
 * parametro nenhum; as demais aceitam o filtro opcional de combustivel.
 */
export const parametrosDe = (
  id: ConsultaId,
  query: Record<string, string | undefined>,
): ParametrosConsulta => {
  const combustivel = lerInteiro(query.combustivel);
  const filtroInvalido =
    query.combustivel !== undefined && combustivel === null;

  if (id === "resumo-atual") return { parametros: [] };

  if (id === "evolucao") {
    const posto = lerInteiro(query.posto);
    if (posto === null)
      return { parametros: [], erro: "Informe o parametro posto." };
    if (combustivel === null) {
      return { parametros: [], erro: "Informe o parametro combustivel." };
    }
    return { parametros: [posto, combustivel] };
  }

  if (filtroInvalido) {
    return {
      parametros: [],
      erro: "O parametro combustivel deve ser um numero inteiro.",
    };
  }

  return { parametros: [combustivel] };
};
