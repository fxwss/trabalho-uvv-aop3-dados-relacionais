#!/usr/bin/env node
/**
 * Confere se o ambiente está pronto antes de rodar os comandos do monorepo.
 *
 * O objetivo é trocar erros crípticos, como "No workspaces found", por uma
 * instrução clara de como resolver. Roda automaticamente antes de `dev`,
 * `build`, `seed` e `test`.
 *
 * Uso: node scripts/verificar-ambiente.mjs [--precisa-banco]
 */
import { existsSync } from 'node:fs'
import { connect } from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const VERSAO_MINIMA_DO_NODE = 20
const WORKSPACES = ['api', 'web', 'shared']
const PORTA_PADRAO_DO_BANCO = 5433

const precisaBanco = process.argv.includes('--precisa-banco')
const problemas = []

// 1. Versão do Node
const versaoAtual = Number(process.versions.node.split('.')[0])
if (versaoAtual < VERSAO_MINIMA_DO_NODE) {
  problemas.push(
    `Node ${process.versions.node} em uso, mas o projeto pede Node ${VERSAO_MINIMA_DO_NODE} ou superior.`,
  )
}

// 2. Dependências instaladas na raiz
const raizNodeModules = join(RAIZ, 'node_modules')
if (!existsSync(raizNodeModules)) {
  problemas.push(`A pasta node_modules não existe em ${RAIZ}.`)
}

// 3. Links dos workspaces criados pelo npm install da raiz
const linksFaltando = WORKSPACES.filter(
  (nome) => !existsSync(join(raizNodeModules, '@precos', nome)),
)
if (linksFaltando.length > 0) {
  problemas.push(
    `Os workspaces @precos/${linksFaltando.join(', @precos/')} não estão ligados em node_modules/@precos.`,
  )
}

if (problemas.length > 0) {
  console.error('\nO ambiente ainda não está pronto para este comando:\n')
  for (const problema of problemas) console.error(`  - ${problema}`)
  console.error(`
Como resolver:
  1. Instale as dependências na RAIZ do projeto, nunca dentro de apps/api ou apps/web:
       npm install
  2. Se o erro continuar, apague o que sobrou e instale de novo:
       rm -rf node_modules apps/*/node_modules packages/*/node_modules package-lock.json
       npm install
  3. Confirme a versão do Node:
       node -v      # precisa ser 20 ou superior
  4. Use um único gerenciador de pacotes. Se você rodou yarn, pnpm ou bun antes,
     apague as pastas node_modules que eles criaram antes de usar o npm.

Detalhes no README, na seção "Problemas comuns".
`)
  process.exit(1)
}

// 4. Aviso (não bloqueia) quando o banco de desenvolvimento não responde
if (precisaBanco) {
  const porta = Number(process.env.PGPORT ?? PORTA_PADRAO_DO_BANCO)
  const host = process.env.PGHOST ?? '127.0.0.1'

  const respondeu = await new Promise((resolver) => {
    const socket = connect({ host, port: porta })
    const finalizar = (resultado) => {
      socket.destroy()
      resolver(resultado)
    }
    socket.setTimeout(700)
    socket.on('connect', () => finalizar(true))
    socket.on('timeout', () => finalizar(false))
    socket.on('error', () => finalizar(false))
  })

  if (!respondeu) {
    console.warn(
      `\nAviso: nenhum Postgres respondeu em ${host}:${porta}. A API vai subir, mas as telas ficarão sem dados.\n` +
      'Suba o banco de desenvolvimento com: npm run banco:dev\n',
    )
  }
}
