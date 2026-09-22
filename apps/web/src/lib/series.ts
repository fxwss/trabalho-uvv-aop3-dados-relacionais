import { compararCombustivel } from "@precos/shared";
import type { SerieGrafico } from "../components/GraficoLinha.tsx";

export interface PontoGrafico {
  [chave: string]: string | number;
}

export interface SerieEntrada {
  dataColeta: string;
  nomeSerie: string;
  valor: number;
}

interface ResultadoPivot {
  dados: PontoGrafico[];
  series: SerieGrafico[];
}

/**
 * Converte a lista de linhas do banco (uma por data e por serie) no formato que
 * o Recharts espera: um objeto por data, com uma chave numerica por serie.
 */
export const pivotarSeries = (
  entradas: SerieEntrada[],
  corDe: (nome: string, indice: number) => string,
  ordenarComoCombustivel = true,
): ResultadoPivot => {
  const nomes = [...new Set(entradas.map((entrada) => entrada.nomeSerie))];
  const nomesOrdenados = ordenarComoCombustivel
    ? nomes.sort(compararCombustivel)
    : [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const porData = new Map<string, PontoGrafico>();
  for (const entrada of entradas) {
    const ponto = porData.get(entrada.dataColeta) ?? {
      dataColeta: entrada.dataColeta,
    };
    ponto[entrada.nomeSerie] = entrada.valor;
    porData.set(entrada.dataColeta, ponto);
  }

  const dados = [...porData.values()].sort((a, b) =>
    String(a.dataColeta).localeCompare(String(b.dataColeta)),
  );

  return {
    dados,
    series: nomesOrdenados.map((nome, indice) => ({
      chave: nome,
      nome,
      cor: corDe(nome, indice),
    })),
  };
};
