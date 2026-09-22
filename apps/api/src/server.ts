import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { bancoRespondendo, encerrarPool, motivoDaFalhaDoBanco } from "./db.ts";
import { env } from "./env.ts";
import { rotasCatalogo } from "./rotas/catalogo.ts";
import { rotasConsultas } from "./rotas/consultas.ts";
import { rotasExportacao } from "./rotas/exportacao.ts";

export const app = new Hono();

app.use("*", logger());
app.use("/api/*", cors({ origin: env.origemPermitida }));

app.get("/", (c) =>
  c.json({
    nome: "API de precos de combustiveis (AOP3)",
    cidade: "Vila Velha/ES",
    documentacao:
      "Os endpoints seguem as consultas do item II.d e as planilhas do item II.e.",
    endpoints: [
      "GET /api/health",
      "GET /api/catalogo",
      "GET /api/meta",
      "GET /api/postos",
      "GET /api/combustiveis",
      "GET /api/bairros",
      "GET /api/consulta/min-max?combustivel=",
      "GET /api/consulta/media-amostras?combustivel=",
      "GET /api/consulta/ultimo-preco?combustivel=",
      "GET /api/consulta/evolucao?posto=&combustivel=",
      "GET /api/consulta/media-evolucao?combustivel=",
      "GET /api/consulta/media-evolucao-posto?combustivel=",
      "GET /api/consulta/resumo-atual",
      "GET /api/export/csv/:id",
      "GET /api/export/xlsx/:id",
      "GET /api/export/planilha-completa.xlsx",
    ],
  }),
);

app.get("/api/health", async (c) => {
  const bancoOk = await bancoRespondendo();
  if (!bancoOk) {
    return c.json(
      {
        status: "erro",
        banco: false,
        ambiente: env.ambiente,
        motivo: motivoDaFalhaDoBanco(),
      },
      503,
    );
  }
  return c.json({
    status: "ok",
    banco: true,
    ambiente: env.ambiente,
    verificadoEm: new Date().toISOString(),
  });
});

app.route("/api", rotasCatalogo);
app.route("/api", rotasConsultas);
app.route("/api", rotasExportacao);

app.notFound((c) =>
  c.json({ erro: `Rota nao encontrada: ${c.req.method} ${c.req.path}` }, 404),
);

app.onError((erro, c) => {
  console.error("Erro na API:", erro);
  const detalhe = env.ambiente === "production" ? undefined : erro.message;
  return c.json({ erro: "Erro interno na API", detalhe }, 500);
});

const servidor = serve({ fetch: app.fetch, port: env.porta }, (info) => {
  console.log(`API de precos ouvindo em http://localhost:${info.port}`);
});

const encerrar = async (): Promise<void> => {
  await encerrarPool();
  servidor.close(() => {
    process.exit(0);
  });
};

process.on("SIGTERM", encerrar);
process.on("SIGINT", encerrar);
