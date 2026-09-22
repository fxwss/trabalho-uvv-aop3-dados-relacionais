/**
 * Contratos de dados do site de precos de combustiveis.
 *
 * Os nomes de campo em camelCase batem exatamente com os apelidos usados no SQL
 * das consultas (`packages/shared/src/sql.ts`), entao nao existe camada de traducao
 * entre banco, API e interface.
 */

/** Consulta I do item II.d: menor e maior preco de cada tipo de combustivel. */
export interface ConsultaMinMax {
  tipo: "MENOR" | "MAIOR";
  combustivel: string;
  posto: string;
  endereco: string;
  bairro: string;
  preco: number;
  dataColeta: string;
}

/** Consulta II do item II.d: quantidade de amostras e preco medio. */
export interface ConsultaMediaAmostras {
  posto: string;
  bairro: string;
  combustivel: string;
  precoMedio: number;
  quantidadeAmostras: number;
}

/** Consulta III do item II.d: preco mais recente por posto e combustivel. */
export interface ConsultaUltimoPreco {
  posto: string;
  bairro: string;
  combustivel: string;
  preco: number;
  dataColeta: string;
}

/** Consulta IV do item II.d: evolucao do preco de um combustivel em um posto. */
export interface ConsultaEvolucao {
  posto: string;
  bairro: string;
  combustivel: string;
  preco: number;
  dataColeta: string;
}

/** Item II.e, grafico 1: evolucao do preco medio de cada combustivel. */
export interface EvolucaoMedia {
  combustivel: string;
  dataColeta: string;
  precoMedio: number;
  quantidadeAmostras: number;
}

/** Item II.e, grafico 2: evolucao do preco medio de cada combustivel em cada posto. */
export interface EvolucaoMediaPosto {
  posto: string;
  bairro: string;
  dataColeta: string;
  precoMedio: number;
  quantidadeAmostras: number;
}

/** Ultima coleta de cada combustivel, usado nos cartoes do painel. */
export interface ResumoAtual {
  combustivel: string;
  precoMedio: number;
  menorPreco: number;
  maiorPreco: number;
  quantidadeAmostras: number;
  dataColeta: string;
}

/** Media geral por combustivel em todo o periodo coletado. */
export interface MediaCombustivel {
  combustivel: string;
  precoMedio: number;
  quantidadeAmostras: number;
}

export interface PostoDetalhe {
  codigo: number;
  nomeFantasia: string;
  cnpj: string | null;
  logradouro: string;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  telefone: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  quantidadeColetas: number;
  ultimaColeta: string | null;
}

export interface CombustivelDetalhe {
  codigo: number;
  nome: string;
  unidadeMedida: string;
  quantidadeAmostras: number;
  precoMedio: number | null;
}

export interface BairroDetalhe {
  codigo: number;
  nome: string;
  quantidadePostos: number;
}

export interface MetaResumo {
  cidade: string;
  uf: string;
  totalPostos: number;
  totalBairros: number;
  totalCombustiveis: number;
  totalColetas: number;
  primeiraColeta: string;
  ultimaColeta: string;
  mediaPorCombustivel: MediaCombustivel[];
}

export interface Catalogo {
  meta: MetaResumo;
  postos: PostoDetalhe[];
  combustiveis: CombustivelDetalhe[];
  bairros: BairroDetalhe[];
  atualizadoEm: string;
}

export interface RespostaErro {
  erro: string;
  detalhe?: string;
}
