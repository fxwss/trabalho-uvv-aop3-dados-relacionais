import { Hono } from "hono";
import { buscarConsulta, type ConsultaId } from "@precos/shared";
import { consultar } from "../db.ts";
import { parametrosDe } from "../parametros.ts";

export const rotasConsultas = new Hono();

/**
 * Executa uma das consultas registradas em `@precos/shared`.
 *
 * A resposta devolve a definicao completa (titulo, requisito, colunas e o SQL
 * executado) junto com as linhas, para o site montar tabela, planilha e o painel
 * que mostra a consulta ao usuario.
 */
rotasConsultas.get("/consulta/:id", async (c) => {
  const id = c.req.param("id") as ConsultaId;
  const definicao = buscarConsulta(id);

  if (!definicao) {
    return c.json({ erro: `Consulta desconhecida: ${id}` }, 404);
  }

  const { parametros, erro } = parametrosDe(id, c.req.query());
  if (erro) {
    return c.json({ erro }, 400);
  }

  const linhas = await consultar<Record<string, unknown>>(
    definicao.sql,
    parametros,
  );

  return c.json({
    consulta: {
      id: definicao.id,
      requisito: definicao.requisito,
      titulo: definicao.titulo,
      descricao: definicao.descricao,
      arquivo: definicao.arquivo,
      colunas: definicao.colunas,
      sql: definicao.sql,
    },
    linhas,
    total: linhas.length,
    geradoEm: new Date().toISOString(),
  });
});

/** Texto das consultas sem executar nada, usado na pagina de metodologia. */
rotasConsultas.get("/consulta-sql/:id", (c) => {
  const definicao = buscarConsulta(c.req.param("id") as ConsultaId);
  if (!definicao) {
    return c.json({ erro: `Consulta desconhecida: ${c.req.param("id")}` }, 404);
  }
  return c.text(definicao.sql, 200, {
    "content-type": "text/plain; charset=utf-8",
  });
});
