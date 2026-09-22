import { Pool, types } from "pg";
import { env } from "./env.ts";

/**
 * `DATE` (1082) chega como string `YYYY-MM-DD` para nao sofrer deslocamento de
 * fuso, e `NUMERIC` (1700) chega como number para os precos ja virem prontos
 * para formatacao.
 */
types.setTypeParser(1082, (valor: string) => valor);
types.setTypeParser(1700, (valor: string) => Number(valor));

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (erro) => {
  console.error("Erro inesperado em conexao ociosa do Postgres:", erro.message);
});

export const consultar = async <TLinha>(
  sql: string,
  parametros: unknown[] = [],
): Promise<TLinha[]> => {
  const resultado = await pool.query(sql, parametros);
  return resultado.rows as TLinha[];
};

export const consultarUma = async <TLinha>(
  sql: string,
  parametros: unknown[] = [],
): Promise<TLinha | null> => {
  const linhas = await consultar<TLinha>(sql, parametros);
  return linhas[0] ?? null;
};

/**
 * Traduz os erros de conexão mais comuns em uma instrução prática, para o log da
 * API não deixar o time preso em "password authentication failed" sem saída.
 */
const AJUDA_POR_CODIGO: Record<string, string> = {
  "28P01":
    "Senha do Postgres incorreta. O banco só aplica POSTGRES_PASSWORD na criação do volume, " +
    'então trocar a senha no .env depois do primeiro "npm run compose:up" deixa o volume com a ' +
    'senha antiga. Rode "npm run compose:reset" para recriar o volume com a carga, ou volte a ' +
    'senha anterior no .env. O comando "npm run diagnostico" confirma qual senha o volume aceita.',
  "3D000":
    'O banco informado em DATABASE_URL não existe neste servidor. Rode "npm run compose:reset" ' +
    "para a carga inicial criar o banco de novo.",
  ECONNREFUSED:
    "Nenhum Postgres respondeu no endereço configurado. Para desenvolver local, suba o banco com " +
    '"npm run banco:dev".',
  ENOTFOUND:
    "O host do banco não foi encontrado. Fora do Docker o host é 127.0.0.1; dentro do compose é " +
    'o nome do serviço, "db".',
};

export interface FalhaDoBanco {
  codigo: string;
  mensagem: string;
  ajuda?: string;
}

let ultimaFalha: FalhaDoBanco | null = null;

export const bancoRespondendo = async (): Promise<boolean> => {
  try {
    await pool.query("SELECT 1");
    ultimaFalha = null;
    return true;
  } catch (erro) {
    const codigo = (erro as { code?: string }).code ?? "SEM_CODIGO";
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    const ajuda = AJUDA_POR_CODIGO[codigo];

    if (ultimaFalha?.codigo !== codigo || ultimaFalha.mensagem !== mensagem) {
      console.error(`Falha ao conectar no Postgres (${codigo}): ${mensagem}`);
      if (ajuda) console.error(`Como resolver: ${ajuda}`);
    }

    ultimaFalha = ajuda ? { codigo, mensagem, ajuda } : { codigo, mensagem };
    return false;
  }
};

/** Motivo da última falha de conexão, exposto em `/api/health`. */
export const motivoDaFalhaDoBanco = (): FalhaDoBanco | null => ultimaFalha;

export const encerrarPool = async (): Promise<void> => {
  await pool.end();
};
