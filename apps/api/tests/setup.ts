/**
 * Aponta os testes para o Postgres de desenvolvimento antes de `src/db.ts` ser
 * carregado. Suba o banco com `npm run banco:dev` na raiz do projeto.
 */
process.env.DATABASE_URL ??=
  "postgres://precos:precos@localhost:5433/combustivel";
process.env.NODE_ENV = "test";
