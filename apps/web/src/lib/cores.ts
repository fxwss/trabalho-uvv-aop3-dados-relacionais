import { slug } from "@precos/shared";

/** Cores fixas por combustivel, alinhadas com os tokens do `index.css`. */
const CORES_COMBUSTIVEL: Record<string, string> = {
  gasolina: "#1d4ed8",
  "gasolina-aditivada": "#7c3aed",
  etanol: "#15803d",
  "diesel-comum": "#c2410c",
  "diesel-s10": "#0e7490",
};

const PALETA_POSTOS = [
  "#0f766e",
  "#b45309",
  "#1d4ed8",
  "#be123c",
  "#4d7c0f",
  "#7c3aed",
  "#0891b2",
  "#a16207",
];

const COR_NEUTRA = "#475569";

export const corCombustivel = (nome: string): string =>
  CORES_COMBUSTIVEL[slug(nome)] ?? COR_NEUTRA;

export const corPosto = (indice: number): string =>
  PALETA_POSTOS[indice % PALETA_POSTOS.length];

export const corPorIndice = (indice: number): string =>
  PALETA_POSTOS[indice % PALETA_POSTOS.length];
