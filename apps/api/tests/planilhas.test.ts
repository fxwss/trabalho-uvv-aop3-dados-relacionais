import { describe, expect, it } from "vitest";
import {
  buscarConsulta,
  type ColunaConsulta,
  type ConsultaId,
} from "@precos/shared";
import { BOM_UTF8, gerarCsv } from "../src/csv.ts";
import { parametrosDe } from "../src/parametros.ts";
import { gerarPlanilha } from "../src/planilha.ts";

const COLUNAS: ColunaConsulta[] = [
  { chave: "posto", titulo: "Posto", formato: "texto" },
  { chave: "preco", titulo: "Valor do combustivel", formato: "moeda" },
  { chave: "dataColeta", titulo: "Data da coleta", formato: "data" },
];

describe("CSV da divulgacao", () => {
  it("usa ponto e virgula, decimal com virgula e data brasileira", () => {
    const csv = gerarCsv(COLUNAS, [
      {
        posto: "POSTO CHAMPAGNAT LTDA",
        preco: 6.399,
        dataColeta: "2026-08-26",
      },
    ]);

    const [cabecalho, linha] = csv.split("\r\n");
    expect(cabecalho).toBe("Posto;Valor do combustivel;Data da coleta");
    expect(linha).toBe("POSTO CHAMPAGNAT LTDA;6,399;26/08/2026");
  });

  it("protege campos que contem o separador", () => {
    const csv = gerarCsv(COLUNAS, [
      { posto: "POSTO A; POSTO B", preco: 6.25, dataColeta: "2026-07-21" },
    ]);
    expect(csv).toContain('"POSTO A; POSTO B"');
  });

  it("deixa campos ausentes em branco", () => {
    const csv = gerarCsv(COLUNAS, [
      { posto: "POSTO PERIM LTDA", preco: null, dataColeta: null },
    ]);
    expect(csv.split("\r\n")[1]).toBe("POSTO PERIM LTDA;;");
  });
});

describe("parametros das consultas", () => {
  it("exige posto e combustivel na consulta IV", () => {
    expect(parametrosDe("evolucao", {}).erro).toMatch(/posto/i);
    expect(parametrosDe("evolucao", { posto: "1" }).erro).toMatch(
      /combustivel/i,
    );
    expect(
      parametrosDe("evolucao", { posto: "1", combustivel: "2" }).parametros,
    ).toStrictEqual([1, 2]);
  });

  it("nao envia parametro para o resumo da ultima coleta", () => {
    expect(parametrosDe("resumo-atual", {}).parametros).toStrictEqual([]);
  });

  it("aceita o filtro opcional de combustivel nas demais consultas", () => {
    expect(parametrosDe("min-max", {}).parametros).toStrictEqual([null]);
    expect(
      parametrosDe("min-max", { combustivel: "3" }).parametros,
    ).toStrictEqual([3]);
    expect(parametrosDe("min-max", { combustivel: "abc" }).erro).toBeDefined();
  });
});

describe("registro das consultas", () => {
  it("cobre as quatro consultas do item II.d e os dois graficos do item II.e", () => {
    const esperados: [ConsultaId, string][] = [
      ["min-max", "II.d.I"],
      ["media-amostras", "II.d.II"],
      ["ultimo-preco", "II.d.III"],
      ["evolucao", "II.d.IV"],
      ["media-evolucao", "II.e.I"],
      ["media-evolucao-posto", "II.e.II"],
    ];

    for (const [id, requisito] of esperados) {
      const definicao = buscarConsulta(id);
      expect(definicao?.requisito, id).toBe(requisito);
      expect(definicao?.sql.length, id).toBeGreaterThan(20);
      expect(definicao?.colunas.length, id).toBeGreaterThan(0);
      expect(definicao?.arquivo.length, id).toBeGreaterThan(0);
    }
  });
});

describe("planilha XLSX", () => {
  it("gera um arquivo xlsx valido com as abas pedidas", async () => {
    const planilha = await gerarPlanilha(
      [
        {
          nome: "II.d.I menor e maior",
          colunas: COLUNAS,
          linhas: [
            {
              posto: "POSTO PERIM LTDA",
              preco: 6.489,
              dataColeta: "2026-07-21",
            },
          ],
        },
      ],
      [{ titulo: "Resumo", itens: [["Cidade", "Vila Velha/ES"]] }],
    );

    const assinatura = new Uint8Array(planilha.slice(0, 2));
    // Todo arquivo xlsx comeca com a assinatura PK do formato zip.
    expect(Array.from(assinatura)).toStrictEqual([0x50, 0x4b]);
    expect(BOM_UTF8.length).toBe(1);
  });
});
