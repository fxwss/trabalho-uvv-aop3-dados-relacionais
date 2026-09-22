import { Hono } from "hono";
import {
  CONSULTAS,
  SQL_MEDIA_POR_COMBUSTIVEL,
  SQL_META,
  SQL_POSTOS,
  buscarConsulta,
  type ConsultaId,
  type DefinicaoConsulta,
  type PostoDetalhe,
} from "@precos/shared";
import { BOM_UTF8, gerarCsv, type LinhaGenerica } from "../csv.ts";
import { consultar, consultarUma } from "../db.ts";
import { parametrosDe } from "../parametros.ts";
import { gerarPlanilha, type AbaPlanilha } from "../planilha.ts";

export const rotasExportacao = new Hono();

interface LinhaMeta {
  cidade: string;
  uf: string;
  totalPostos: number;
  totalBairros: number;
  totalCombustiveis: number;
  totalColetas: number;
  primeiraColeta: string;
  ultimaColeta: string;
}

const NOMES_DAS_ABAS: Record<ConsultaId, string> = {
  "min-max": "II.d.I menor e maior preco",
  "media-amostras": "II.d.II media e amostras",
  "ultimo-preco": "II.d.III preco mais recente",
  evolucao: "II.d.IV evolucao",
  "media-evolucao": "II.e.I media geral",
  "media-evolucao-posto": "II.e.II media por posto",
  "resumo-atual": "Ultima coleta",
};

const hoje = (): string => new Date().toISOString().slice(0, 10);

const nomeArquivo = (base: string, extensao: string): string =>
  `${base}-${hoje()}.${extensao}`;

const cabecalhosCsv = (nome: string) => ({
  "content-type": "text/csv; charset=utf-8",
  "content-disposition": `attachment; filename="${nome}"`,
});

const cabecalhosPlanilha = (nome: string) => ({
  "content-type":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "content-disposition": `attachment; filename="${nome}"`,
});

const resolver = (id: string): DefinicaoConsulta | Response => {
  const definicao = buscarConsulta(id as ConsultaId);
  if (definicao) return definicao;
  return Response.json(
    { erro: `Consulta desconhecida: ${id}` },
    { status: 404 },
  );
};

/** Planilha de uma consulta especifica, com os mesmos filtros dos endpoints de consulta. */
rotasExportacao.get("/export/csv/:id", async (c) => {
  const id = c.req.param("id") ?? "";
  const definicao = resolver(id);
  if (definicao instanceof Response) return definicao;

  const { parametros, erro } = parametrosDe(definicao.id, c.req.query());
  if (erro) return c.json({ erro }, 400);

  const linhas = await consultar<LinhaGenerica>(definicao.sql, parametros);
  const csv = `${BOM_UTF8}${gerarCsv(definicao.colunas, linhas)}`;

  return c.body(csv, 200, cabecalhosCsv(nomeArquivo(definicao.arquivo, "csv")));
});

rotasExportacao.get("/export/xlsx/:id", async (c) => {
  const id = c.req.param("id") ?? "";
  const definicao = resolver(id);
  if (definicao instanceof Response) return definicao;

  const { parametros, erro } = parametrosDe(definicao.id, c.req.query());
  if (erro) return c.json({ erro }, 400);

  const linhas = await consultar<LinhaGenerica>(definicao.sql, parametros);
  const planilha = await gerarPlanilha(
    [
      {
        nome: NOMES_DAS_ABAS[definicao.id],
        colunas: definicao.colunas,
        linhas,
      },
    ],
    [
      {
        titulo: definicao.titulo,
        itens: [
          ["Requisito atendido", definicao.requisito],
          ["Consulta executada", definicao.sql],
          ["Registros", String(linhas.length)],
          ["Gerado em", new Date().toLocaleString("pt-BR")],
        ],
      },
    ],
  );

  return c.body(
    planilha,
    200,
    cabecalhosPlanilha(nomeArquivo(definicao.arquivo, "xlsx")),
  );
});

/**
 * Planilha unica de divulgacao (item II.e): todas as consultas do item II.d,
 * os dados dos dois graficos obrigatorios e o cadastro de postos.
 */
rotasExportacao.get("/export/planilha-completa.xlsx", async (c) => {
  const [meta, postos, medias] = await Promise.all([
    consultarUma<LinhaMeta>(SQL_META),
    consultar<PostoDetalhe>(SQL_POSTOS),
    consultar<{
      combustivel: string;
      precoMedio: number;
      quantidadeAmostras: number;
    }>(SQL_MEDIA_POR_COMBUSTIVEL),
  ]);

  if (!meta) {
    return c.json(
      { erro: "Banco sem cidade cadastrada. Rode a carga de dados." },
      503,
    );
  }

  const exportaveis = CONSULTAS.filter(
    (consulta) => consulta.id !== "evolucao",
  );

  const abas: AbaPlanilha[] = [];
  for (const consulta of exportaveis) {
    // `parametrosDe` devolve a quantidade exata de parametros que cada SQL espera.
    const { parametros } = parametrosDe(consulta.id, {});
    const linhas = await consultar<LinhaGenerica>(consulta.sql, parametros);
    abas.push({
      nome: NOMES_DAS_ABAS[consulta.id],
      colunas: consulta.colunas,
      linhas,
    });
  }

  abas.push({
    nome: "Postos cadastrados",
    colunas: [
      { chave: "nomeFantasia", titulo: "Posto", formato: "texto" },
      { chave: "cnpj", titulo: "CNPJ", formato: "texto" },
      { chave: "logradouro", titulo: "Logradouro", formato: "texto" },
      { chave: "numero", titulo: "Numero", formato: "texto" },
      { chave: "bairro", titulo: "Bairro", formato: "texto" },
      { chave: "telefone", titulo: "Telefone", formato: "texto" },
      { chave: "quantidadeColetas", titulo: "Amostras", formato: "numero" },
      { chave: "ultimaColeta", titulo: "Ultima coleta", formato: "data" },
    ],
    linhas: postos as unknown as LinhaGenerica[],
  });

  const planilha = await gerarPlanilha(abas, [
    {
      titulo: "AOP3 - divulgacao dos precos de combustiveis",
      itens: [
        ["Cidade", `${meta.cidade}/${meta.uf}`],
        [
          "Periodo das coletas",
          `${meta.primeiraColeta} a ${meta.ultimaColeta}`,
        ],
        ["Postos cadastrados", String(meta.totalPostos)],
        ["Bairros atendidos", String(meta.totalBairros)],
        ["Tipos de combustivel", String(meta.totalCombustiveis)],
        ["Amostras de preco (coletas)", String(meta.totalColetas)],
        ["Gerado em", new Date().toLocaleString("pt-BR")],
      ],
    },
    {
      titulo: "Abas desta planilha",
      itens: [
        [
          "II.d.I menor e maior preco",
          "Menor e maior preco de cada combustivel, com posto, endereco, bairro e data",
        ],
        [
          "II.d.II media e amostras",
          "Quantidade de amostras e preco medio por posto e combustivel",
        ],
        [
          "II.d.III preco mais recente",
          "Preco mais recente de cada posto e combustivel",
        ],
        [
          "II.e.I media geral",
          "Dados do grafico de evolucao do preco medio de cada combustivel",
        ],
        [
          "II.e.II media por posto",
          "Dados do grafico de evolucao do preco medio em cada posto",
        ],
        ["Ultima coleta", "Menor, maior e preco medio na coleta mais recente"],
        [
          "Postos cadastrados",
          "Cadastro dos postos com endereco, bairro e volume coletado",
        ],
      ],
    },
    {
      titulo: "Media geral por combustivel no periodo",
      itens: medias.map((media) => [
        media.combustivel,
        `${media.precoMedio.toFixed(3)} por litro em ${media.quantidadeAmostras} amostras`,
      ]),
    },
    {
      titulo: "Observacoes",
      itens: [
        [
          "Consulta IV (II.d.IV)",
          "A evolucao por posto e por combustivel esta no site, em cada posto",
        ],
        [
          "Graficos",
          "Os dois graficos do item II.e sao renderizados no site, na pagina Planilhas",
        ],
        [
          "Fonte",
          "Coleta propria nos postos, com enderecos conferidos pela base publica de CNPJ",
        ],
      ],
    },
  ]);

  return c.body(
    planilha,
    200,
    cabecalhosPlanilha(nomeArquivo("planilha-completa-aop3", "xlsx")),
  );
});
