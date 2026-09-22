/** Formatadores pt-BR usados no site e na geracao das planilhas. */

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

const formatadorMoedaCurta = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatadorNumero = new Intl.NumberFormat("pt-BR");

const MESES = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Preco por litro com tres casas, como o banco armazena (`DECIMAL(6,3)`). */
export const formatMoeda = (valor: number): string =>
  formatadorMoeda.format(valor);

/** Valor arredondado para centavos, melhor para titulos e cartoes. */
export const formatMoedaCurta = (valor: number): string =>
  formatadorMoedaCurta.format(valor);

export const formatNumero = (valor: number): string =>
  formatadorNumero.format(valor);

/**
 * Converte a data ISO (`YYYY-MM-DD`) que o Postgres devolve em `DD/MM/YYYY`.
 * A quebra manual evita o deslocamento de um dia causado por fuso horario.
 */
export const formatData = (iso: string): string => {
  const [ano, mes, dia] = iso.split("-");
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
};

/** Ex.: `21/08/2026`, `21 de agosto de 2026`. */
export const formatDataLonga = (iso: string): string => {
  const [ano, mes, dia] = iso.split("-");
  const nomeDoMes = MESES[Number(mes) - 1];
  if (!ano || !nomeDoMes || !dia) return iso;
  return `${Number(dia)} de ${nomeDoMes} de ${ano}`;
};

/** Ordem canonica dos combustiveis monitorados, independente do banco. */
export const ORDEM_COMBUSTIVEIS = [
  "Gasolina",
  "Gasolina aditivada",
  "Etanol",
  "Diesel comum",
  "Diesel S10",
] as const;

/** Comparador para manter a ordem canonica em tabelas, legendas e graficos. */
export const compararCombustivel = (a: string, b: string): number => {
  const posicaoA = ORDEM_COMBUSTIVEIS.indexOf(
    a as (typeof ORDEM_COMBUSTIVEIS)[number],
  );
  const posicaoB = ORDEM_COMBUSTIVEIS.indexOf(
    b as (typeof ORDEM_COMBUSTIVEIS)[number],
  );
  if (posicaoA === -1 && posicaoB === -1) return a.localeCompare(b, "pt-BR");
  if (posicaoA === -1) return 1;
  if (posicaoB === -1) return -1;
  return posicaoA - posicaoB;
};

/** `Gasolina aditivada` vira `gasolina-aditivada`, util para classes e ids. */
export const slug = (texto: string): string =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Formata o valor de uma celula conforme o tipo declarado na coluna. */
export const formatarValor = (valor: unknown, formato: string): string => {
  if (valor === null || valor === undefined) return "";
  if (formato === "moeda") return formatMoeda(Number(valor));
  if (formato === "data") return formatData(String(valor));
  if (formato === "numero") return formatNumero(Number(valor));
  return String(valor);
};
