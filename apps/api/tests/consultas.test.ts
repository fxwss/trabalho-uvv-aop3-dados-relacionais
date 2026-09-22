import { beforeAll, describe, expect, it } from "vitest";
import {
  SQL_MEDIA_AMOSTRAS,
  SQL_META,
  SQL_MIN_MAX,
  SQL_ULTIMO_PRECO,
  SQL_EVOLUCAO,
  SQL_MEDIA_EVOLUCAO,
  SQL_MEDIA_EVOLUCAO_POSTO,
} from "@precos/shared";
import type { ConsultaMinMax, ConsultaUltimoPreco } from "@precos/shared";
import { bancoRespondendo, consultar } from "../src/db.ts";

interface LinhaMinMaxBanco {
  combustivel: string;
  menor: number;
  maior: number;
}

interface LinhaAmostrasBanco {
  posto: string;
  combustivel: string;
  amostras: number;
  media: number;
}

interface LinhaColeta {
  posto: string;
  combustivel: string;
  dataColeta: string;
  preco: number;
}

beforeAll(async () => {
  const respondendo = await bancoRespondendo();
  if (!respondendo) {
    throw new Error(
      "Banco indisponivel. Rode `npm run banco:dev` na raiz e confira a DATABASE_URL dos testes.",
    );
  }
});

describe("consulta I - menor e maior preco (II.d.I)", () => {
  it("retorna um MENOR e um MAIOR para cada combustivel com coleta", async () => {
    const esperado = await consultar<LinhaMinMaxBanco>(
      `SELECT co.nome AS "combustivel", MIN(col.preco) AS "menor", MAX(col.preco) AS "maior"
       FROM coleta col
       JOIN combustivel co ON co.codigo_combustivel = col.codigo_combustivel
       GROUP BY co.nome`,
    );

    const linhas = await consultar<ConsultaMinMax>(SQL_MIN_MAX, [null]);

    expect(linhas.length).toBe(esperado.length * 2);

    for (const referencia of esperado) {
      const doCombustivel = linhas.filter(
        (linha) => linha.combustivel === referencia.combustivel,
      );
      const menor = doCombustivel.find((linha) => linha.tipo === "MENOR");
      const maior = doCombustivel.find((linha) => linha.tipo === "MAIOR");

      expect(menor?.preco, `menor preco de ${referencia.combustivel}`).toBe(
        referencia.menor,
      );
      expect(maior?.preco, `maior preco de ${referencia.combustivel}`).toBe(
        referencia.maior,
      );
    }
  });

  it("entrega os campos exigidos pelo enunciado em cada linha", async () => {
    const linhas = await consultar<ConsultaMinMax>(SQL_MIN_MAX, [null]);

    for (const linha of linhas) {
      expect(linha.posto.length).toBeGreaterThan(0);
      expect(linha.endereco.length).toBeGreaterThan(0);
      expect(linha.bairro.length).toBeGreaterThan(0);
      expect(linha.combustivel.length).toBeGreaterThan(0);
      expect(linha.preco).toBeGreaterThan(0);
      expect(linha.dataColeta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("respeita o filtro de combustivel", async () => {
    const combustiveis = await consultar<{ codigo: number; nome: string }>(
      'SELECT codigo_combustivel AS "codigo", nome FROM combustivel ORDER BY codigo_combustivel',
    );
    const escolhido = combustiveis[0];
    expect(escolhido).toBeDefined();

    const linhas = await consultar<ConsultaMinMax>(SQL_MIN_MAX, [
      escolhido?.codigo ?? 0,
    ]);
    expect(linhas.length).toBe(2);
    for (const linha of linhas) expect(linha.combustivel).toBe(escolhido?.nome);
  });
});

describe("consulta II - amostras e preco medio (II.d.II)", () => {
  it("bate com a agregacao feita direto no banco", async () => {
    const esperado = await consultar<LinhaAmostrasBanco>(
      `SELECT p.nome_fantasia AS "posto", co.nome AS "combustivel",
              COUNT(*)::int AS "amostras", ROUND(AVG(col.preco), 3) AS "media"
       FROM coleta col
       JOIN posto p ON p.codigo_posto = col.codigo_posto
       JOIN combustivel co ON co.codigo_combustivel = col.codigo_combustivel
       GROUP BY p.nome_fantasia, co.nome`,
    );

    const linhas = await consultar<{
      posto: string;
      bairro: string;
      combustivel: string;
      precoMedio: number;
      quantidadeAmostras: number;
    }>(SQL_MEDIA_AMOSTRAS, [null]);

    expect(linhas.length).toBe(esperado.length);

    for (const referencia of esperado) {
      const linha = linhas.find(
        (item) =>
          item.posto === referencia.posto &&
          item.combustivel === referencia.combustivel,
      );
      expect(
        linha,
        `linha de ${referencia.posto} / ${referencia.combustivel}`,
      ).toBeDefined();
      expect(linha?.quantidadeAmostras).toBe(referencia.amostras);
      expect(linha?.precoMedio).toBeCloseTo(referencia.media, 3);
      expect(linha?.bairro.length).toBeGreaterThan(0);
    }
  });
});

describe("consulta III - preco mais recente (II.d.III)", () => {
  it("retorna a data maxima de cada par posto e combustivel", async () => {
    const esperado = await consultar<{
      posto: string;
      combustivel: string;
      data: string;
    }>(
      `SELECT p.nome_fantasia AS "posto", co.nome AS "combustivel", MAX(col.data_coleta)::text AS "data"
       FROM coleta col
       JOIN posto p ON p.codigo_posto = col.codigo_posto
       JOIN combustivel co ON co.codigo_combustivel = col.codigo_combustivel
       GROUP BY p.nome_fantasia, co.nome`,
    );

    const linhas = await consultar<ConsultaUltimoPreco>(SQL_ULTIMO_PRECO, [
      null,
    ]);
    expect(linhas.length).toBe(esperado.length);

    for (const referencia of esperado) {
      const linha = linhas.find(
        (item) =>
          item.posto === referencia.posto &&
          item.combustivel === referencia.combustivel,
      );
      expect(linha?.dataColeta).toBe(referencia.data);
      expect(linha?.preco).toBeGreaterThan(0);
      expect(linha?.bairro.length).toBeGreaterThan(0);
    }
  });
});

describe("consulta IV - evolucao (II.d.IV)", () => {
  it("devolve a serie em ordem crescente de data, de um unico posto e combustivel", async () => {
    const combinacao = await consultar<{
      posto: number;
      combustivel: number;
      nome: string;
    }>(
      `SELECT col.codigo_posto AS "posto", col.codigo_combustivel AS "combustivel",
              co.nome AS "nome", COUNT(*) AS "total"
       FROM coleta col
       JOIN combustivel co ON co.codigo_combustivel = col.codigo_combustivel
       GROUP BY col.codigo_posto, col.codigo_combustivel, co.nome
       ORDER BY COUNT(*) DESC
       LIMIT 1`,
    );
    const alvo = combinacao[0];
    expect(alvo).toBeDefined();

    const linhas = await consultar<LinhaColeta>(SQL_EVOLUCAO, [
      alvo?.posto,
      alvo?.combustivel,
    ]);
    expect(linhas.length).toBeGreaterThanOrEqual(5);

    const datas = linhas.map((linha) => linha.dataColeta);
    expect(datas).toStrictEqual([...datas].sort());

    for (const linha of linhas) {
      expect(linha.combustivel).toBe(alvo?.nome);
      expect(linha.posto.length).toBeGreaterThan(0);
      expect(linha.preco).toBeGreaterThan(0);
    }
  });
});

describe("consultas dos graficos (II.e)", () => {
  it("a media geral agrupa por combustivel e data", async () => {
    const linhas = await consultar<{
      combustivel: string;
      dataColeta: string;
      precoMedio: number;
    }>(SQL_MEDIA_EVOLUCAO, [null]);
    expect(linhas.length).toBeGreaterThan(0);
    const chaves = new Set(
      linhas.map((linha) => `${linha.combustivel}|${linha.dataColeta}`),
    );
    expect(chaves.size).toBe(linhas.length);
    for (const linha of linhas) expect(linha.precoMedio).toBeGreaterThan(0);
  });

  it("a media por posto pode ser filtrada por combustivel", async () => {
    const combustiveis = await consultar<{ codigo: number }>(
      'SELECT codigo_combustivel AS "codigo" FROM combustivel ORDER BY codigo_combustivel',
    );
    const escolhido = combustiveis[0]?.codigo ?? 0;

    const todas = await consultar<{ posto: string }>(SQL_MEDIA_EVOLUCAO_POSTO, [
      null,
    ]);
    const filtradas = await consultar<{ posto: string }>(
      SQL_MEDIA_EVOLUCAO_POSTO,
      [escolhido],
    );

    expect(todas.length).toBeGreaterThan(filtradas.length);
    expect(filtradas.length).toBeGreaterThan(0);
  });
});

describe("requisitos do enunciado no banco carregado", () => {
  it("cumpre II.a, II.b e II.c", async () => {
    const meta = await consultar<{
      totalPostos: number;
      totalBairros: number;
      totalCombustiveis: number;
      totalColetas: number;
    }>(SQL_META);

    const resumo = meta[0];
    expect(resumo?.totalPostos).toBeGreaterThanOrEqual(5);
    expect(resumo?.totalBairros).toBeGreaterThanOrEqual(2);
    expect(resumo?.totalCombustiveis).toBeGreaterThanOrEqual(4);

    const coletasPorPosto = await consultar<{ posto: string; datas: number }>(
      `SELECT p.nome_fantasia AS "posto", COUNT(DISTINCT col.data_coleta)::int AS "datas"
       FROM coleta col
       JOIN posto p ON p.codigo_posto = col.codigo_posto
       GROUP BY p.nome_fantasia`,
    );

    expect(coletasPorPosto.length).toBe(resumo?.totalPostos);
    for (const posto of coletasPorPosto) {
      expect(
        posto.datas,
        `datas distintas de ${posto.posto}`,
      ).toBeGreaterThanOrEqual(5);
    }
  });

  it("nao guarda preco duplicado na mesma data para o mesmo posto e combustivel", async () => {
    const duplicados = await consultar<{ total: number }>(
      `SELECT COUNT(*)::int AS "total" FROM (
         SELECT codigo_posto, codigo_combustivel, data_coleta
         FROM coleta
         GROUP BY codigo_posto, codigo_combustivel, data_coleta
         HAVING COUNT(*) > 1
       ) duplicados`,
    );
    expect(duplicados[0]?.total).toBe(0);
  });
});
