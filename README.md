# Preços dos combustíveis de Vila Velha/ES

Site de divulgação dos preços de combustíveis coletados em postos de Vila Velha/ES. É a entrega da
**AOP3** (opção _a_, criação de website) do trabalho de banco de dados, construída sobre o banco
relacional criado na AOP2.

O site permite ao morador da cidade consultar:

| Requisito   | O que a tela mostra                                                         | Rota          |
| ----------- | --------------------------------------------------------------------------- | ------------- |
| II.d.I      | Menor e maior preço de cada combustível, com posto, endereço, bairro e data | `/consulta-1` |
| II.d.II     | Quantidade de amostras e preço médio por posto e combustível                | `/consulta-2` |
| II.d.III    | Preço mais recente de cada posto e combustível                              | `/consulta-3` |
| II.d.IV     | Evolução do preço de um combustível em um posto escolhido                   | `/consulta-4` |
| II.e        | Planilhas (CSV e XLSX) e os dois gráficos de evolução do preço médio        | `/planilhas`  |
| II.a a II.c | Postos, bairros e volumes coletados, com comparador de preços               | `/postos`     |

Cada tela mostra também a consulta SQL que gerou o resultado, o que documenta o projeto físico da
AOP2 dentro da própria divulgação.

## Como o projeto está organizado

Monorepo com npm workspaces:

```
apps/web        site em React 19 + TypeScript + Vite + Tailwind CSS 4 + Recharts
apps/api        API em Node.js + Hono + pg, executa as consultas SQL e gera as planilhas
packages/shared tipos, textos SQL e formatadores compartilhados entre API e site
dados           sql.sql (DDL da AOP2), dados.sql (carga gerada) e a coleta em CSV
scripts         gerador da carga a partir do CSV da coleta
apresentacao    PDF de apresentação da entrega e script que o gera
docker          Dockerfiles e configuração do nginx
compose.yaml    stack completa: Postgres + API + site
```

O SQL vive em `packages/shared/src/sql.ts` e é a fonte única: a API executa exatamente o texto que o
site exibe ao usuário.

## Subir tudo com Docker

```bash
cp .env.example .env          # a senha já vem igual ao padrão; troque só antes do primeiro up
npm run compose:up            # constrói as imagens e sobe os três contêineres
```

Depois acesse `http://localhost:8080`. Para derrubar use `npm run compose:down` e, para apagar o
banco e recarregar os dados do zero, `npm run compose:reset`.

A carga inicial (`dados/sql.sql` e depois `dados/dados.sql`) roda automaticamente na primeira subida
do banco, quando o volume ainda está vazio.

## Desenvolvimento local

Requisito: **Node.js 20 ou superior** e Docker (para o banco). A instalação das dependências é sempre
feita na **raiz** do projeto, porque os três pacotes do monorepo são ligados pelo npm workspaces.

```bash
npm install                   # na raiz, nunca dentro de apps/api ou apps/web
npm run banco:dev             # sobe só o Postgres de desenvolvimento na porta 5433
npm run dev                   # API em http://localhost:3333 e site em http://localhost:5173
```

O site em desenvolvimento chama `/api` e o Vite encaminha para a API. Para apontar para outro banco,
defina `DATABASE_URL` antes de subir a API. Antes de `dev`, `build`, `seed` e `test` o projeto roda
`scripts/verificar-ambiente.mjs`, que interrompe a execução com instruções claras se o Node estiver
antigo, se faltar `npm install` ou se os links dos workspaces não existirem.

## Dados

A coleta fica em `dados/coletas_validas_AOP2.csv`: 6 postos, 6 bairros e 136 amostras de preço entre
julho e agosto de 2026, nos cinco combustíveis monitorados (gasolina, gasolina aditivada, etanol,
diesel comum e diesel S10).

Como o CSV não traz endereço, e a consulta II.d.I exige esse dado, o script `npm run seed`:

1. lê o CSV da coleta;
2. consulta a base pública de CNPJ (BrasilAPI) para obter logradouro, número, complemento, CEP e
   telefone de cada posto;
3. grava `dados/posto_enderecos.csv`, que fica no repositório para revisão e correção manual;
4. gera `dados/dados.sql` com os INSERTs idempotentes de cidade, bairros, postos, combustíveis e
   coletas.

Para forçar a consulta dos endereços de novo:

```bash
npm run seed -- --revalidar
```

Edições manuais de endereço devem ser feitas em `dados/posto_enderecos.csv`; o `dados.sql` é
regenerado a partir dele, então não vale a pena editar o SQL na mão.

## API

| Método e rota                                          | Descrição                                                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                                      | Estado da API e da conexão com o banco                                                                                       |
| `GET /api/catalogo`                                    | Meta, postos, combustíveis e bairros em uma chamada                                                                          |
| `GET /api/meta`                                        | Cidade, período e volumes coletados                                                                                          |
| `GET /api/postos`, `/api/combustiveis`, `/api/bairros` | Cadastros usados nos filtros                                                                                                 |
| `GET /api/consulta/:id`                                | Consultas `min-max`, `media-amostras`, `ultimo-preco`, `evolucao`, `media-evolucao`, `media-evolucao-posto` e `resumo-atual` |
| `GET /api/export/csv/:id`                              | Mesma consulta em CSV (separador `;`, decimal com vírgula, BOM UTF-8)                                                        |
| `GET /api/export/xlsx/:id`                             | Mesma consulta em planilha do Excel                                                                                          |
| `GET /api/export/planilha-completa.xlsx`               | Planilha de divulgação com todas as abas, o cadastro de postos e as médias                                                   |

Parâmetros: `combustivel` (código) nas consultas I, II, III e nos gráficos; `posto` e `combustivel`
são obrigatórios na consulta IV.

## Testes

```bash
npm run banco:dev
npm test
```

Os testes de integração confirmam, contra o banco real, que as quatro consultas do item II.d batem
com agregações feitas direto no SQL, que a consulta IV vem ordenada por data, que os requisitos
II.a, II.b e II.c estão atendidos na carga e que o CSV e o XLSX saem no formato esperado.

## Divulgação para a comunidade

Além do site, a entrega cobre as outras duas opções do enunciado:

- **Mídias sociais (opção b):** cada tela tem botões de compartilhar no WhatsApp e de copiar o link,
  e as páginas têm metatags Open Graph para o link aparecer com título e descrição.
- **Locais públicos (opção c):** as telas de consulta e de planilhas foram feitas para impressão,
  com menu e botões escondidos em `Ctrl+P`. Os gráficos também podem ser baixados em PNG para
  imprimir no mural da igreja, associação de bairro ou comércio local.

## Apresentação em PDF

O arquivo `apresentacao/AOP3-apresentacao-precos-combustiveis.pdf` tem 16 slides em 16:9 com a
capa, o problema e as três fases, a coleta (II.a a II.c), a modelagem ER e o projeto físico, as
quatro consultas do II.d com o SQL real do projeto, capturas do site em execução, os dois gráficos
do II.e, a arquitetura do site, as três opções de divulgação e a conclusão.

Os números vêm da própria coleta (`dados/coletas_validas_AOP2.csv`), o SQL é lido de
`packages/shared/src/sql.ts` e as telas são capturas de `apresentacao/img/`. Para regerar depois de
mudar dados ou SQL:

```bash
npm run apresentacao        # usa o python do .venv, se existir; senão o python3 do sistema
```

O script `apresentacao/gerar_apresentacao.py` monta o PDF com matplotlib, calculando altura das
caixas e quebra de linha a partir da medida real da fonte, então nada fica cortado. Só é preciso
trocar o nome do professor e a data na capa, se forem diferentes.

## Problemas comuns

**`No workspaces found: --workspace=@precos/api` ou `No workspace found`**

O npm não encontrou os pacotes do monorepo. Isso acontece quando o `npm install` foi feito dentro de
`apps/api` ou `apps/web`, quando a instalação não foi feita, ou quando outro gerenciador (yarn,
pnpm, bun) criou as pastas antes. Resolva com:

```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules package-lock.json
npm install        # na raiz do projeto
npm run dev
```

Os atalhos do `package.json` já não dependem do nome do workspace (usam `--prefix apps/api` e
`--prefix apps/web`), então a única exigência é a instalação correta na raiz.

**`password authentication failed for user "precos"`**

O Postgres aplica `POSTGRES_PASSWORD` apenas quando o volume do banco é **criado**. Se a senha do
`.env` foi trocada depois do primeiro `npm run compose:up`, o volume continua com a senha antiga e a
API não consegue autenticar. Um comando mostra qual senha o volume aceita:

```bash
npm run diagnostico
```

Escolha uma das saídas: recriar o volume com a senha nova, o que reaplica a carga automaticamente
(`npm run compose:reset`), ou voltar a senha anterior no `.env`. Se a mesma mensagem aparecer no
ambiente de desenvolvimento, faça o mesmo com o serviço `db-dev`:
`docker compose --profile dev down -v && npm run banco:dev`.

**O site abre, mas as telas dizem que não foi possível carregar os dados**

A API subiu sem banco. Verifique com `docker compose ps` e suba o banco de desenvolvimento:

```bash
npm run banco:dev
```

**Porta ocupada (5173, 3333 ou 8080)**

Feche o processo que está usando a porta ou troque a do site com `PORTA_SITE=8081 npm run compose:up`.
Para a API em desenvolvimento, use `PORT=3334` e ajuste o proxy com `VITE_API_PROXY=http://localhost:3334 npm run dev`.

**`npm run apresentacao` reclama de matplotlib**

Instale a biblioteca no Python que será usado: `python3 -m pip install matplotlib`, ou crie o
ambiente virtual do projeto com `python3 -m venv ../.venv && ../.venv/bin/pip install matplotlib`.

## Integrantes

- Erick Marques
- Lucas Tejada Fabres
- Thiago Tejada Fabres
