const lerInteiro = (valor: string | undefined, padrao: number): number => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : padrao;
};

export const env = {
  porta: lerInteiro(process.env.PORT, 3333),
  // Padrao alinhado com o servico `db-dev` do compose, subido por `npm run banco:dev`.
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://precos:precos@localhost:5433/combustivel",
  origemPermitida: process.env.CORS_ORIGIN ?? "*",
  ambiente: process.env.NODE_ENV ?? "development",
};
