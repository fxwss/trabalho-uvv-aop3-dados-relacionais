import { Hono } from "hono";
import {
  SQL_BAIRROS,
  SQL_COMBUSTIVEIS,
  SQL_MEDIA_POR_COMBUSTIVEL,
  SQL_META,
  SQL_POSTOS,
  compararCombustivel,
} from "@precos/shared";
import type {
  BairroDetalhe,
  CombustivelDetalhe,
  MetaResumo,
  PostoDetalhe,
} from "@precos/shared";
import { consultar, consultarUma } from "../db.ts";

export const rotasCatalogo = new Hono();

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

const carregarCatalogo = async () => {
  const [meta, postos, combustiveis, bairros, medias] = await Promise.all([
    consultarUma<LinhaMeta>(SQL_META),
    consultar<PostoDetalhe>(SQL_POSTOS),
    consultar<CombustivelDetalhe>(SQL_COMBUSTIVEIS),
    consultar<BairroDetalhe>(SQL_BAIRROS),
    consultar<MetaResumo["mediaPorCombustivel"][number]>(
      SQL_MEDIA_POR_COMBUSTIVEL,
    ),
  ]);

  return {
    meta: meta ? { ...meta, mediaPorCombustivel: medias } : null,
    postos,
    combustiveis: [...combustiveis].sort((a, b) =>
      compararCombustivel(a.nome, b.nome),
    ),
    bairros,
    atualizadoEm: new Date().toISOString(),
  };
};

/** Tudo que o site precisa para filtros, cabecalho e pagina de metodologia. */
rotasCatalogo.get("/catalogo", async (c) => {
  const catalogo = await carregarCatalogo();
  if (!catalogo.meta) {
    return c.json(
      { erro: "Banco sem cidade cadastrada. Rode a carga de dados." },
      503,
    );
  }
  return c.json(catalogo);
});

rotasCatalogo.get("/meta", async (c) => {
  const [meta, medias] = await Promise.all([
    consultarUma<LinhaMeta>(SQL_META),
    consultar<MetaResumo["mediaPorCombustivel"][number]>(
      SQL_MEDIA_POR_COMBUSTIVEL,
    ),
  ]);
  if (!meta) {
    return c.json(
      { erro: "Banco sem cidade cadastrada. Rode a carga de dados." },
      503,
    );
  }
  return c.json({ ...meta, mediaPorCombustivel: medias } satisfies MetaResumo);
});

rotasCatalogo.get("/postos", async (c) =>
  c.json(await consultar<PostoDetalhe>(SQL_POSTOS)),
);

rotasCatalogo.get("/combustiveis", async (c) => {
  const combustiveis = await consultar<CombustivelDetalhe>(SQL_COMBUSTIVEIS);
  return c.json(
    [...combustiveis].sort((a, b) => compararCombustivel(a.nome, b.nome)),
  );
});

rotasCatalogo.get("/bairros", async (c) =>
  c.json(await consultar<BairroDetalhe>(SQL_BAIRROS)),
);
