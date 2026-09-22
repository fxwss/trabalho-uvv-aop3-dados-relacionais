#!/usr/bin/env node
/**
 * Diagnostica a conexão da API com o Postgres em um único comando.
 *
 * Lê o `.env` (se existir), monta a URL que a API usaria e tenta conectar,
 * traduzindo o erro do Postgres em uma instrução de como resolver. Também testa
 * a senha padrão para detectar o caso clássico de volume criado antes da troca
 * de senha no `.env`.
 *
 * Uso: npm run diagnostico
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const SENHA_PADRAO = 'precos'

const lerEnv = (caminho) => {
  const valores = {}
  for (const linha of readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const texto = linha.trim()
    if (!texto || texto.startsWith('#')) continue
    const separador = texto.indexOf('=')
    if (separador === -1) continue
    valores[texto.slice(0, separador).trim()] = texto.slice(separador + 1).trim()
  }
  return valores
}

const mascarar = (url) => url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@')

const testar = async (url) => {
  const cliente = new Client({ connectionString: url, connectionTimeoutMillis: 3000 })
  try {
    // `pg` só envia a consulta depois do connect, então a chamada é obrigatória.
    await cliente.connect()
    const resultado = await cliente.query(
      'SELECT (SELECT COUNT(*) FROM posto) AS postos, (SELECT COUNT(*) FROM coleta) AS coletas',
    )
    await cliente.end()
    return {
      ok: true,
      postos: Number(resultado.rows[0].postos),
      coletas: Number(resultado.rows[0].coletas),
    }
  } catch (erro) {
    await cliente.end().catch(() => { })
    return { ok: false, codigo: erro.code ?? 'SEM_CODIGO', mensagem: erro.message }
  }
}

const trocarSenha = (url, senha) => url.replace(/:\/\/([^:]+):([^@]+)@/, `://$1:${senha}@`)

const arquivoEnv = join(RAIZ, '.env')
const doEnv = existsSync(arquivoEnv) ? lerEnv(arquivoEnv) : {}

const banco = doEnv.POSTGRES_DB ?? 'combustivel'
const usuario = doEnv.POSTGRES_USER ?? 'precos'
const senha = doEnv.POSTGRES_PASSWORD ?? SENHA_PADRAO
const porta = Number(doEnv.PORTA_BANCO_LOCAL ?? 5433)
const url = process.env.DATABASE_URL ?? `postgres://${usuario}:${senha}@127.0.0.1:${porta}/${banco}`
const alvo = new URL(url)
const destino = `${alvo.hostname}:${alvo.port || 5432}`

console.log(`Arquivo .env: ${existsSync(arquivoEnv) ? 'encontrado' : 'não existe (usando os valores padrão)'}`)
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'definida no ambiente' : 'não definida, usando o banco de desenvolvimento'}`)
console.log(`Destino testado: ${destino}`)
console.log(`URL testada: ${mascarar(url)}\n`)

const resultado = await testar(url)

if (resultado.ok) {
  console.log(`Conexão OK: o banco respondeu com ${resultado.postos} postos e ${resultado.coletas} coletas.`)
  process.exit(0)
}

console.log(`Falhou com ${resultado.codigo}: ${resultado.mensagem}\n`)

if (resultado.codigo === '28P01') {
  console.log('A senha configurada não é a senha que o volume do banco tem guardada.')
  console.log('O Postgres só aplica POSTGRES_PASSWORD quando o volume é criado.\n')

  const alternativas = [
    ['senha padrão do compose', trocarSenha(url, SENHA_PADRAO)],
    ...(doEnv.POSTGRES_PASSWORD ? [['senha do .env', trocarSenha(url, doEnv.POSTGRES_PASSWORD)]] : []),
  ]

  for (const [rotulo, candidata] of alternativas) {
    const teste = await testar(candidata)
    if (teste.ok) {
      console.log(`A ${rotulo} funcionou (${teste.postos} postos, ${teste.coletas} coletas).`)
    }
  }

  console.log(`
Como resolver, escolhendo uma das opções:
  1. Recriar o volume com a senha do .env (recarrega a carga automaticamente):
       npm run compose:reset        # para o stack, apaga os volumes e sobe de novo
  2. Ou voltar a senha anterior no .env, se você já tinha dados coletados no volume.

Se o erro apareceu no banco de desenvolvimento (npm run banco:dev), faça o mesmo:
       docker compose --profile dev down -v && npm run banco:dev
`)
  process.exit(1)
}

if (resultado.codigo === 'ECONNREFUSED' || resultado.codigo === 'ENOTFOUND') {
  console.log(`Nenhum Postgres respondeu em ${destino}.

Se você está rodando a API localmente:
       npm run banco:dev

Se a API está no Docker, o host do banco é o serviço "db" da rede do compose. Nesse caso rode:
       docker compose logs api | tail -20      # a API registra a mesma orientação
`)
  process.exit(1)
}

if (resultado.codigo === '3D000') {
  console.log(`O banco "${banco}" não existe neste servidor.

Recrie o volume para a carga inicial rodar de novo:
       npm run compose:reset
`)
  process.exit(1)
}

console.log('Não reconheci este erro. Verifique se as variáveis do .env batem com o serviço db do compose.yaml.')
process.exit(1)
