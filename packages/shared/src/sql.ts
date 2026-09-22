import type {
  ConsultaEvolucao,
  ConsultaMediaAmostras,
  ConsultaMinMax,
  ConsultaUltimoPreco,
  EvolucaoMedia,
  EvolucaoMediaPosto,
  ResumoAtual,
} from "./types.ts";

/** Identificadores das consultas expostas pela API e pelas planilhas. */
export type ConsultaId =
  | "min-max"
  | "media-amostras"
  | "ultimo-preco"
  | "evolucao"
  | "media-evolucao"
  | "media-evolucao-posto"
  | "resumo-atual";

export type FormatoColuna = "moeda" | "data" | "numero" | "texto";

export interface ColunaConsulta {
  chave: string;
  titulo: string;
  formato: FormatoColuna;
}

export interface DefinicaoConsulta {
  id: ConsultaId;
  requisito: string;
  titulo: string;
  descricao: string;
  arquivo: string;
  sql: string;
  colunas: ColunaConsulta[];
}

export interface ConsultaLinhaMap {
  "min-max": ConsultaMinMax;
  "media-amostras": ConsultaMediaAmostras;
  "ultimo-preco": ConsultaUltimoPreco;
  evolucao: ConsultaEvolucao;
  "media-evolucao": EvolucaoMedia;
  "media-evolucao-posto": EvolucaoMediaPosto;
  "resumo-atual": ResumoAtual;
}

/**
 * Consulta I do item II.d.
 *
 * A janela `ROW_NUMBER` isola, por combustivel, a coleta de menor preco e a de
 * maior preco. Havendo empate, vence a coleta mais recente. O `UNION ALL` mantem
 * as duas linhas com a marca `MENOR` e `MAIOR`.
 */
export const SQL_MIN_MAX = `WITH precos AS (
  SELECT
    co.nome AS "combustivel",
    p.nome_fantasia AS "posto",
    CONCAT_WS(', ', p.endereco_logradouro, p.endereco_numero) AS "endereco",
    b.nome AS "bairro",
    col.preco AS "preco",
    col.data_coleta::text AS "dataColeta",
    ROW_NUMBER() OVER (
      PARTITION BY col.codigo_combustivel
      ORDER BY col.preco ASC, col.data_coleta DESC
    ) AS posicao_menor,
    ROW_NUMBER() OVER (
      PARTITION BY col.codigo_combustivel
      ORDER BY col.preco DESC, col.data_coleta DESC
    ) AS posicao_maior
  FROM coleta col
  JOIN posto p ON p.codigo_posto = col.codigo_posto
  JOIN bairro b ON b.codigo_bairro = p.codigo_bairro
  JOIN combustivel co ON co.codigo_combustivel = col.codigo_combustivel
  WHERE ($1::int IS NULL OR col.codigo_combustivel = $1::int)
)
SELECT 'MENOR' AS "tipo", "combustivel", "posto", "endereco", "bairro", "preco", "dataColeta"
FROM precos
WHERE posicao_menor = 1
UNION ALL
SELECT 'MAIOR' AS "tipo", "combustivel", "posto", "endereco", "bairro", "preco", "dataColeta"
FROM precos
WHERE posicao_maior = 1`;

/**
 * Consulta II do item II.d: agrega por posto e combustivel a quantidade de
 * amostras e o preco medio arredondado em tres casas.
 */
export const SQL_MEDIA_AMOSTRAS = `SELECT
  p.nome_fantasia AS "posto",
  b.nome AS "bairro",
  co.nome AS "combustivel",
  ROUND(AVG(col.preco), 3) AS "precoMedio",
  COUNT(*)::int AS "quantidadeAmostras"
FROM coleta col
JOIN posto p ON p.codigo_posto = col.codigo_posto
JOIN bairro b ON b.codigo_bairro = p.codigo_bairro
JOIN combustivel co ON co.codigo_combustivel = col.codigo_combustivel
WHERE ($1::int IS NULL OR co.codigo_combustivel = $1::int)
GROUP BY p.codigo_posto, p.nome_fantasia, b.nome, co.codigo_combustivel, co.nome`;

/**
 * Consulta III do item II.d: `DISTINCT ON` mantem apenas a coleta mais recente
 * de cada par posto e combustivel.
 */
export const SQL_ULTIMO_PRECO = `SELECT
  "posto",
  "bairro",
  "combustivel",
  "preco",
  "dataColeta"
FROM (
  SELECT DISTINCT ON (col.codigo_posto, col.codigo_combustivel)
    p.nome_fantasia AS "posto",
    b.nome AS "bairro",
    co.nome AS "combustivel",
    col.preco AS "preco",
    col.data_coleta::text AS "dataColeta"
  FROM coleta col
  JOIN posto p ON p.codigo_posto = col.codigo_posto
  JOIN bairro b ON b.codigo_bairro = p.codigo_bairro
  JOIN combustivel co ON co.codigo_combustivel = col.codigo_combustivel
  WHERE ($1::int IS NULL OR co.codigo_combustivel = $1::int)
  ORDER BY col.codigo_posto, col.codigo_combustivel, col.data_coleta DESC
) ultimos`;

/** Consulta IV do item II.d: serie historica de um combustivel em um posto. */
export const SQL_EVOLUCAO = `SELECT
  p.nome_fantasia AS "posto",
  b.nome AS "bairro",
  co.nome AS "combustivel",
  col.preco AS "preco",
  col.data_coleta::text AS "dataColeta"
FROM coleta col
JOIN posto p ON p.codigo_posto = col.codigo_posto
JOIN bairro b ON b.codigo_bairro = p.codigo_bairro
JOIN combustivel co ON co.codigo_combustivel = col.codigo_combustivel
WHERE col.codigo_posto = $1::int
  AND col.codigo_combustivel = $2::int
ORDER BY col.data_coleta`;

/**
 * Item II.e, grafico 1: preco medio de cada combustivel em cada data de coleta.
 * O `GROUP BY` na data faz a media entre postos.
 */
export const SQL_MEDIA_EVOLUCAO = `SELECT
  co.nome AS "combustivel",
  col.data_coleta::text AS "dataColeta",
  ROUND(AVG(col.preco), 3) AS "precoMedio",
  COUNT(*)::int AS "quantidadeAmostras"
FROM coleta col
JOIN combustivel co ON co.codigo_combustivel = col.codigo_combustivel
WHERE ($1::int IS NULL OR co.codigo_combustivel = $1::int)
GROUP BY co.codigo_combustivel, co.nome, col.data_coleta
ORDER BY co.nome, col.data_coleta`;

/**
 * Item II.e, grafico 2: preco medio por posto em cada data, com filtro opcional
 * de combustivel.
 */
export const SQL_MEDIA_EVOLUCAO_POSTO = `SELECT
  p.nome_fantasia AS "posto",
  b.nome AS "bairro",
  col.data_coleta::text AS "dataColeta",
  ROUND(AVG(col.preco), 3) AS "precoMedio",
  COUNT(*)::int AS "quantidadeAmostras"
FROM coleta col
JOIN posto p ON p.codigo_posto = col.codigo_posto
JOIN bairro b ON b.codigo_bairro = p.codigo_bairro
WHERE ($1::int IS NULL OR col.codigo_combustivel = $1::int)
GROUP BY p.codigo_posto, p.nome_fantasia, b.nome, col.data_coleta
ORDER BY p.nome_fantasia, col.data_coleta`;

/**
 * Ultima coleta de cada combustivel, base dos cartoes do painel. Usa a data
 * maxima global para mostrar quanto o combustivel custa agora na cidade.
 */
export const SQL_RESUMO_ATUAL = `WITH ultima_data AS (
  SELECT MAX(data_coleta) AS data FROM coleta
)
SELECT
  co.nome AS "combustivel",
  ROUND(AVG(col.preco), 3) AS "precoMedio",
  MIN(col.preco) AS "menorPreco",
  MAX(col.preco) AS "maiorPreco",
  COUNT(*)::int AS "quantidadeAmostras",
  MAX(col.data_coleta)::text AS "dataColeta"
FROM coleta col
JOIN combustivel co ON co.codigo_combustivel = col.codigo_combustivel
WHERE col.data_coleta = (SELECT data FROM ultima_data)
GROUP BY co.codigo_combustivel, co.nome
ORDER BY co.nome`;

/** Media geral por combustivel em todo o periodo, usada na metodologia. */
export const SQL_MEDIA_POR_COMBUSTIVEL = `SELECT
  co.nome AS "combustivel",
  ROUND(AVG(col.preco), 3) AS "precoMedio",
  COUNT(*)::int AS "quantidadeAmostras"
FROM coleta col
JOIN combustivel co ON co.codigo_combustivel = col.codigo_combustivel
GROUP BY co.codigo_combustivel, co.nome
ORDER BY co.nome`;

/** Resumo do projeto: cidade, periodo e volumes coletados. */
export const SQL_META = `SELECT
  ci.nome AS "cidade",
  ci.uf AS "uf",
  (SELECT COUNT(*)::int FROM posto) AS "totalPostos",
  (SELECT COUNT(*)::int FROM bairro) AS "totalBairros",
  (SELECT COUNT(*)::int FROM combustivel) AS "totalCombustiveis",
  (SELECT COUNT(*)::int FROM coleta) AS "totalColetas",
  (SELECT MIN(data_coleta)::text FROM coleta) AS "primeiraColeta",
  (SELECT MAX(data_coleta)::text FROM coleta) AS "ultimaColeta"
FROM cidade ci
ORDER BY ci.codigo_cidade
LIMIT 1`;

/** Cadastro dos postos com bairro, endereco e volume coletado. */
export const SQL_POSTOS = `SELECT
  p.codigo_posto AS "codigo",
  p.nome_fantasia AS "nomeFantasia",
  p.cnpj AS "cnpj",
  p.endereco_logradouro AS "logradouro",
  p.endereco_numero AS "numero",
  p.endereco_complemento AS "complemento",
  p.endereco_cep AS "cep",
  p.telefone AS "telefone",
  b.nome AS "bairro",
  ci.nome AS "cidade",
  ci.uf AS "uf",
  COUNT(col.codigo_coleta)::int AS "quantidadeColetas",
  MAX(col.data_coleta)::text AS "ultimaColeta"
FROM posto p
JOIN bairro b ON b.codigo_bairro = p.codigo_bairro
JOIN cidade ci ON ci.codigo_cidade = b.codigo_cidade
LEFT JOIN coleta col ON col.codigo_posto = p.codigo_posto
GROUP BY p.codigo_posto, p.nome_fantasia, p.cnpj, p.endereco_logradouro, p.endereco_numero,
         p.endereco_complemento, p.endereco_cep, p.telefone, b.nome, ci.nome, ci.uf
ORDER BY p.nome_fantasia`;

/** Tipos de combustivel monitorados com volume e media de preco. */
export const SQL_COMBUSTIVEIS = `SELECT
  co.codigo_combustivel AS "codigo",
  co.nome AS "nome",
  co.unidade_medida AS "unidadeMedida",
  COUNT(col.codigo_coleta)::int AS "quantidadeAmostras",
  ROUND(AVG(col.preco), 3) AS "precoMedio"
FROM combustivel co
LEFT JOIN coleta col ON col.codigo_combustivel = co.codigo_combustivel
GROUP BY co.codigo_combustivel, co.nome, co.unidade_medida
ORDER BY co.codigo_combustivel`;

/** Bairros com a quantidade de postos cadastrados. */
export const SQL_BAIRROS = `SELECT
  b.codigo_bairro AS "codigo",
  b.nome AS "nome",
  COUNT(p.codigo_posto)::int AS "quantidadePostos"
FROM bairro b
LEFT JOIN posto p ON p.codigo_bairro = b.codigo_bairro
GROUP BY b.codigo_bairro, b.nome
ORDER BY b.nome`;

const COLUNAS_MIN_MAX: ColunaConsulta[] = [
  { chave: "combustivel", titulo: "Combustivel", formato: "texto" },
  { chave: "tipo", titulo: "Tipo de preco", formato: "texto" },
  { chave: "posto", titulo: "Posto", formato: "texto" },
  { chave: "endereco", titulo: "Endereco", formato: "texto" },
  { chave: "bairro", titulo: "Bairro", formato: "texto" },
  { chave: "preco", titulo: "Valor do combustivel", formato: "moeda" },
  { chave: "dataColeta", titulo: "Data da coleta", formato: "data" },
];

/**
 * Registro unico das consultas: a API usa o `sql`, o site usa as `colunas` para
 * montar tabelas, CSV e planilha. Assim nao existe divergencia entre o que o
 * banco responde e o que aparece na tela.
 */
export const CONSULTAS: DefinicaoConsulta[] = [
  {
    id: "min-max",
    requisito: "II.d.I",
    titulo: "Menor e maior preco por combustivel",
    descricao:
      "Para cada tipo de combustivel, a coleta de menor preco e a de maior preco, com posto, endereco, bairro e data.",
    arquivo: "menor-e-maior-preco",
    sql: SQL_MIN_MAX,
    colunas: COLUNAS_MIN_MAX,
  },
  {
    id: "media-amostras",
    requisito: "II.d.II",
    titulo: "Quantidade de amostras e preco medio",
    descricao:
      "Para cada posto e combustivel, quantas amostras foram coletadas e qual o preco medio praticado.",
    arquivo: "media-e-amostras",
    sql: SQL_MEDIA_AMOSTRAS,
    colunas: [
      { chave: "posto", titulo: "Posto", formato: "texto" },
      { chave: "bairro", titulo: "Bairro", formato: "texto" },
      { chave: "combustivel", titulo: "Combustivel", formato: "texto" },
      { chave: "precoMedio", titulo: "Preco medio", formato: "moeda" },
      { chave: "quantidadeAmostras", titulo: "Amostras", formato: "numero" },
    ],
  },
  {
    id: "ultimo-preco",
    requisito: "II.d.III",
    titulo: "Preco mais recente por posto",
    descricao:
      "Para cada posto e combustivel, apenas a coleta mais recente registrada, com o valor e a data.",
    arquivo: "preco-mais-recente",
    sql: SQL_ULTIMO_PRECO,
    colunas: [
      { chave: "posto", titulo: "Posto", formato: "texto" },
      { chave: "bairro", titulo: "Bairro", formato: "texto" },
      { chave: "combustivel", titulo: "Combustivel", formato: "texto" },
      { chave: "preco", titulo: "Valor do combustivel", formato: "moeda" },
      { chave: "dataColeta", titulo: "Data da coleta", formato: "data" },
    ],
  },
  {
    id: "evolucao",
    requisito: "II.d.IV",
    titulo: "Evolucao do preco de um combustivel em um posto",
    descricao:
      "Serie historica de um combustivel em um posto especifico, ordenada pelas datas de coleta.",
    arquivo: "evolucao-do-preco",
    sql: SQL_EVOLUCAO,
    colunas: [
      { chave: "posto", titulo: "Posto", formato: "texto" },
      { chave: "bairro", titulo: "Bairro", formato: "texto" },
      { chave: "combustivel", titulo: "Combustivel", formato: "texto" },
      { chave: "preco", titulo: "Valor do combustivel", formato: "moeda" },
      { chave: "dataColeta", titulo: "Data da coleta", formato: "data" },
    ],
  },
  {
    id: "media-evolucao",
    requisito: "II.e.I",
    titulo: "Evolucao do preco medio de cada combustivel",
    descricao:
      "Media entre os postos por data de coleta, base do primeiro grafico exigido na divulgacao.",
    arquivo: "evolucao-do-preco-medio",
    sql: SQL_MEDIA_EVOLUCAO,
    colunas: [
      { chave: "combustivel", titulo: "Combustivel", formato: "texto" },
      { chave: "dataColeta", titulo: "Data da coleta", formato: "data" },
      { chave: "precoMedio", titulo: "Preco medio", formato: "moeda" },
      { chave: "quantidadeAmostras", titulo: "Amostras", formato: "numero" },
    ],
  },
  {
    id: "media-evolucao-posto",
    requisito: "II.e.II",
    titulo: "Evolucao do preco medio de cada combustivel em cada posto",
    descricao:
      "Media por posto em cada data, base do segundo grafico exigido na divulgacao.",
    arquivo: "evolucao-do-preco-medio-por-posto",
    sql: SQL_MEDIA_EVOLUCAO_POSTO,
    colunas: [
      { chave: "posto", titulo: "Posto", formato: "texto" },
      { chave: "bairro", titulo: "Bairro", formato: "texto" },
      { chave: "dataColeta", titulo: "Data da coleta", formato: "data" },
      { chave: "precoMedio", titulo: "Preco medio", formato: "moeda" },
      { chave: "quantidadeAmostras", titulo: "Amostras", formato: "numero" },
    ],
  },
  {
    id: "resumo-atual",
    requisito: "Apoio",
    titulo: "Resumo da ultima coleta",
    descricao:
      "Menor, maior e preco medio de cada combustivel na data da coleta mais recente.",
    arquivo: "resumo-ultima-coleta",
    sql: SQL_RESUMO_ATUAL,
    colunas: [
      { chave: "combustivel", titulo: "Combustivel", formato: "texto" },
      { chave: "dataColeta", titulo: "Data da coleta", formato: "data" },
      { chave: "menorPreco", titulo: "Menor preco", formato: "moeda" },
      { chave: "precoMedio", titulo: "Preco medio", formato: "moeda" },
      { chave: "maiorPreco", titulo: "Maior preco", formato: "moeda" },
      { chave: "quantidadeAmostras", titulo: "Amostras", formato: "numero" },
    ],
  },
];

/** Consultas que alimentam os graficos exigidos no item II.e. */
export const CONSULTAS_DOS_GRAFICOS: ConsultaId[] = [
  "media-evolucao",
  "media-evolucao-posto",
];

export const buscarConsulta = (id: ConsultaId): DefinicaoConsulta | undefined =>
  CONSULTAS.find((consulta) => consulta.id === id);

/** Consultas sem parametro obrigatorio, liberadas para exportacao direta. */
export const consultaPermiteExportacaoSemParametros = (
  id: ConsultaId,
): boolean => id !== "evolucao";
