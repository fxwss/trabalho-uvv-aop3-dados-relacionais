#!/usr/bin/env node
/**
 * Roda o script da apresentação escolhendo um Python que tenha matplotlib.
 *
 * Prefere o ambiente virtual do projeto (`../.venv`), usado nas AOPs anteriores,
 * e cai para o `python3` do sistema. Assim funciona no Linux, no macOS e no
 * Windows sem depender de `sh`.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT = join(RAIZ, 'apresentacao', 'gerar_apresentacao.py')

const candidatos =
  process.platform === 'win32'
    ? [join(RAIZ, '..', '.venv', 'Scripts', 'python.exe'), 'python', 'py']
    : [join(RAIZ, '..', '.venv', 'bin', 'python'), 'python3', 'python']

const python = candidatos.find((caminho) => caminho.includes('python') && existe(caminho))

function existe(caminho) {
  if (caminho === 'python' || caminho === 'python3' || caminho === 'py') {
    const teste = spawnSync(caminho, ['--version'], { stdio: 'ignore' })
    return teste.status === 0
  }
  return existsSync(caminho)
}

if (!python) {
  console.error(
    'Não encontrei um Python para gerar a apresentação.\n\n' +
    'Instale o Python 3 e a biblioteca matplotlib:\n' +
    '  pip install matplotlib\n\n' +
    'Ou crie o ambiente virtual usado no projeto:\n' +
    '  python3 -m venv ../.venv && ../.venv/bin/pip install matplotlib\n',
  )
  process.exit(1)
}

const resultado = spawnSync(python, [SCRIPT], { stdio: 'inherit', cwd: RAIZ })

if (resultado.status !== 0) {
  console.error(
    '\nA geração falhou. Se a mensagem citar matplotlib, instale a biblioteca:\n' +
    `  ${python} -m pip install matplotlib\n`,
  )
}

process.exit(resultado.status ?? 1)
