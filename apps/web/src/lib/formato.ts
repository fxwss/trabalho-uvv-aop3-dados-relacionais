export {
  ORDEM_COMBUSTIVEIS,
  compararCombustivel,
  formatData,
  formatDataLonga,
  formatMoeda,
  formatMoedaCurta,
  formatNumero,
  slug,
} from "@precos/shared";

/** Variacao percentual entre duas medicoes, usada nos cartoes e nas tabelas. */
export const variacaoPercentual = (
  atual: number,
  anterior: number,
): number | null => {
  if (!anterior) return null;
  return ((atual - anterior) / anterior) * 100;
};

export const formatPercentual = (valor: number): string => {
  const sinal = valor > 0 ? "+" : "";
  return `${sinal}${valor.toFixed(1).replace(".", ",")}%`;
};

/** `(27) 3235-2525` a partir dos digitos guardados no banco. */
export const formatTelefone = (digitos: string | null): string => {
  if (!digitos) return "nao informado";
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return digitos;
};

export const montarEndereco = (
  logradouro: string,
  numero: string | null,
  bairro: string,
): string => {
  const complemento = numero ? `, ${numero}` : "";
  return `${logradouro}${complemento} - ${bairro}`;
};
