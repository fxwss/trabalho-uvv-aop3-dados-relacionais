#!/bin/sh
# Aplica o projeto fisico e a carga de dados na primeira subida do container.
# O entrypoint do Postgres executa este arquivo apenas quando o volume esta vazio.
set -e

echo "[init] aplicando o DDL do projeto fisico (dados/sql.sql)"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /carga/sql.sql

echo "[init] aplicando a carga de dados (dados/dados.sql)"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /carga/dados.sql

echo "[init] carga concluida"
