/**
 * Gera `dados/posto_enderecos.csv` e `dados/dados.sql` a partir da coleta da AOP2.
 *
 * O CSV da coleta nao tem endereco, mas a consulta I do item II.d exige esse dado.
 * O script consulta a BrasilAPI pelo CNPJ de cada posto, grava um CSV revisavel e
 * entao monta os INSERTs do banco fisico.
 *
 * Uso:
 *   npm run seed                 reaproveita `dados/posto_enderecos.csv` se existir
 *   npm run seed -- --revalidar  consulta a BrasilAPI de novo e reescreve o CSV
 */
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PASTA_DADOS = join(RAIZ, "dados");
const ARQUIVO_COLETAS = join(PASTA_DADOS, "coletas_validas_AOP2.csv");
const ARQUIVO_ENDERECOS = join(PASTA_DADOS, "posto_enderecos.csv");
const ARQUIVO_SQL = join(PASTA_DADOS, "dados.sql");

const CIDADE = { nome: "Vila Velha", uf: "ES" };

/** Colunas de preco do CSV, na ordem em que viram tipos de combustivel. */
const COMBUSTIVEIS = [
  { coluna: "gasolina", nome: "Gasolina" },
  { coluna: "gasolina_aditivada", nome: "Gasolina aditivada" },
  { coluna: "etanol", nome: "Etanol" },
  { coluna: "diesel_comum", nome: "Diesel comum" },
  { coluna: "diesel_s10", nome: "Diesel S10" },
];

const UNIDADE_MEDIDA = "Litro";

interface Coleta {
  data: string;
  precos: Map<string, number>;
}

interface PostoColeta {
  nome: string;
  cnpj: string;
  bairro: string;
  bandeira: string;
  coletas: Coleta[];
}

interface EnderecoPosto {
  cnpj: string;
  nomeFantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  cep: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone: string;
  bairroColeta: string;
  origem: "brasilapi" | "manual";
}

interface RespostaCnpj {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  cep?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  ddd_telefone_1?: string | null;
}

const revalidar = process.argv.includes("--revalidar");

const apenasDigitos = (valor: string): string => valor.replace(/\D/g, "");

const escaparSql = (valor: string): string => valor.replace(/'/g, "''");

const limpar = (valor: string | null | undefined): string =>
  (valor ?? "").trim();

/** Telefone da Receita vem sem DDD formatado e as vezes como sequencia de zeros. */
const telefoneValido = (bruto: string | null | undefined): string => {
  const digitos = apenasDigitos(limpar(bruto));
  if (digitos.length < 10 || digitos.length > 11) return "";
  if (/^0+$/.test(digitos)) return "";
  return digitos;
};

const dividirLinha = (linha: string): string[] =>
  linha.split(";").map((valor) => valor.trim());

const lerColetas = (conteudo: string): PostoColeta[] => {
  const linhas = conteudo
    .split(/\r?\n/)
    .filter((linha) => linha.trim().length > 0);
  const [cabecalho, ...dados] = linhas;
  const colunas = dividirLinha(cabecalho ?? "");
  const indice = (nome: string): number => colunas.indexOf(nome);

  const postos = new Map<string, PostoColeta>();

  for (const linha of dados) {
    const valores = dividirLinha(linha);
    const cnpj = valores[indice("cnpj")] ?? "";
    const data = valores[indice("data")] ?? "";
    if (!cnpj || !data) continue;

    const precos = new Map<string, number>();
    for (const combustivel of COMBUSTIVEIS) {
      const bruto = valores[indice(combustivel.coluna)] ?? "";
      if (!bruto) continue;
      const preco = Number(bruto.replace(",", "."));
      if (Number.isFinite(preco)) precos.set(combustivel.nome, preco);
    }

    const postoAtual = postos.get(cnpj) ?? {
      nome: valores[indice("posto")] ?? cnpj,
      cnpj,
      bairro: valores[indice("bairro")] ?? "",
      bandeira: valores[indice("bandeira")] ?? "",
      coletas: [],
    };
    postoAtual.coletas.push({ data, precos });
    postos.set(cnpj, postoAtual);
  }

  for (const posto of postos.values()) {
    posto.coletas.sort((a, b) => a.data.localeCompare(b.data));
  }

  return [...postos.values()].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );
};

const lerEnderecosSalvos = (conteudo: string): Map<string, EnderecoPosto> => {
  const linhas = conteudo
    .split(/\r?\n/)
    .filter((linha) => linha.trim().length > 0);
  const [cabecalho, ...dados] = linhas;
  const colunas = dividirLinha(cabecalho ?? "");
  const indice = (nome: string): number => colunas.indexOf(nome);
  const enderecos = new Map<string, EnderecoPosto>();

  for (const linha of dados) {
    const valores = dividirLinha(linha);
    const cnpj = valores[indice("cnpj")] ?? "";
    if (!cnpj) continue;
    enderecos.set(cnpj, {
      cnpj,
      nomeFantasia: valores[indice("nome_fantasia")] ?? "",
      logradouro: valores[indice("logradouro")] ?? "",
      numero: valores[indice("numero")] ?? "",
      complemento: valores[indice("complemento")] ?? "",
      cep: valores[indice("cep")] ?? "",
      bairro: valores[indice("bairro_receita")] ?? "",
      cidade: valores[indice("cidade")] ?? "",
      uf: valores[indice("uf")] ?? "",
      telefone: valores[indice("telefone")] ?? "",
      bairroColeta: valores[indice("bairro_coleta")] ?? "",
      origem:
        valores[indice("origem")] === "brasilapi" ? "brasilapi" : "manual",
    });
  }

  return enderecos;
};

const buscarEndereco = async (posto: PostoColeta): Promise<EnderecoPosto> => {
  const cnpjDigitos = apenasDigitos(posto.cnpj);
  const vazio: EnderecoPosto = {
    cnpj: posto.cnpj,
    nomeFantasia: posto.nome,
    logradouro: "",
    numero: "",
    complemento: "",
    cep: "",
    bairro: "",
    cidade: CIDADE.nome,
    uf: CIDADE.uf,
    telefone: "",
    bairroColeta: posto.bairro,
    origem: "manual",
  };

  try {
    const resposta = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpjDigitos}`,
      {
        // A BrasilAPI esta atras do Cloudflare e recusa o User-Agent padrao do Node com 403.
        headers: {
          accept: "application/json",
          "user-agent":
            "Mozilla/5.0 (compatible; site-coleta-dados-combustivel/1.0)",
        },
      },
    );
    if (!resposta.ok) {
      console.warn(`  ${posto.cnpj}: BrasilAPI respondeu ${resposta.status}`);
      return vazio;
    }
    const dados = (await resposta.json()) as RespostaCnpj;
    return {
      cnpj: posto.cnpj,
      nomeFantasia: posto.nome,
      logradouro: limpar(dados.logradouro),
      numero: limpar(dados.numero),
      complemento: limpar(dados.complemento),
      cep: apenasDigitos(limpar(dados.cep)),
      bairro: limpar(dados.bairro),
      cidade: limpar(dados.municipio) || CIDADE.nome,
      uf: limpar(dados.uf) || CIDADE.uf,
      telefone: telefoneValido(dados.ddd_telefone_1),
      bairroColeta: posto.bairro,
      origem: "brasilapi",
    };
  } catch (erro) {
    console.warn(
      `  ${posto.cnpj}: falha ao consultar a BrasilAPI (${String(erro)})`,
    );
    return vazio;
  }
};

const montarCsvEnderecos = (enderecos: EnderecoPosto[]): string => {
  const cabecalho = [
    "cnpj",
    "nome_fantasia",
    "logradouro",
    "numero",
    "complemento",
    "cep",
    "bairro_receita",
    "cidade",
    "uf",
    "telefone",
    "bairro_coleta",
    "origem",
  ];
  const linhas = enderecos.map((endereco) =>
    [
      endereco.cnpj,
      endereco.nomeFantasia,
      endereco.logradouro,
      endereco.numero,
      endereco.complemento,
      endereco.cep,
      endereco.bairro,
      endereco.cidade,
      endereco.uf,
      endereco.telefone,
      endereco.bairroColeta,
      endereco.origem,
    ].join(";"),
  );
  return [cabecalho.join(";"), ...linhas].join("\n");
};

const valorSql = (valor: string): string =>
  valor ? `'${escaparSql(valor)}'` : "NULL";

const montarSql = (
  postos: PostoColeta[],
  enderecos: Map<string, EnderecoPosto>,
): string => {
  const bairros = [...new Set(postos.map((posto) => posto.bairro))].sort(
    (a, b) => a.localeCompare(b, "pt-BR"),
  );
  const linhas: string[] = [];

  linhas.push(
    "-- AOP2 e AOP3 - Carga inicial do banco de precos de combustiveis",
  );
  linhas.push(`-- Cidade: ${CIDADE.nome}/${CIDADE.uf}`);
  linhas.push(
    "-- Arquivo gerado por `npm run seed`. Nao edite a mao: os ajustes de endereco",
  );
  linhas.push(
    "-- devem ser feitos em `dados/posto_enderecos.csv` e o script rodado de novo.",
  );
  linhas.push("");
  linhas.push("BEGIN;");
  linhas.push("");
  linhas.push("-- Cidade");
  linhas.push("INSERT INTO cidade (nome, uf)");
  linhas.push(
    `SELECT '${escaparSql(CIDADE.nome)}', '${escaparSql(CIDADE.uf)}'`,
  );
  linhas.push(
    `WHERE NOT EXISTS (SELECT 1 FROM cidade WHERE nome = '${escaparSql(CIDADE.nome)}' AND uf = '${escaparSql(CIDADE.uf)}');`,
  );
  linhas.push("");
  linhas.push("-- Bairros");
  linhas.push("INSERT INTO bairro (nome, codigo_cidade)");
  linhas.push("SELECT v.nome, (SELECT codigo_cidade FROM cidade LIMIT 1)");
  linhas.push("FROM (VALUES");
  linhas.push(
    bairros.map((bairro) => `  ('${escaparSql(bairro)}')`).join(",\n"),
  );
  linhas.push(") AS v(nome)");
  linhas.push("ON CONFLICT (nome, codigo_cidade) DO NOTHING;");
  linhas.push("");
  linhas.push("-- Combustiveis monitorados");
  linhas.push("INSERT INTO combustivel (nome, unidade_medida)");
  linhas.push("SELECT v.nome, v.unidade_medida");
  linhas.push("FROM (VALUES");
  linhas.push(
    COMBUSTIVEIS.map(
      (combustivel) =>
        `  ('${escaparSql(combustivel.nome)}', '${UNIDADE_MEDIDA}')`,
    ).join(",\n"),
  );
  linhas.push(") AS v(nome, unidade_medida)");
  linhas.push("ON CONFLICT (nome) DO NOTHING;");
  linhas.push("");
  linhas.push("-- Postos com endereco vindo da base publica de CNPJ");
  linhas.push(
    "INSERT INTO posto (nome_fantasia, cnpj, endereco_logradouro, endereco_numero, endereco_complemento, endereco_cep, telefone, codigo_bairro)",
  );
  linhas.push(
    "SELECT v.nome_fantasia, v.cnpj, v.logradouro, v.numero, v.complemento, v.cep, v.telefone,",
  );
  linhas.push(
    "       (SELECT codigo_bairro FROM bairro WHERE nome = v.bairro)",
  );
  linhas.push("FROM (VALUES");

  const valoresPostos = postos.map((posto) => {
    const endereco = enderecos.get(posto.cnpj);
    const logradouro = limpar(endereco?.logradouro) || "Endereco nao informado";
    return `  (${valorSql(posto.nome)}, '${escaparSql(posto.cnpj)}', '${escaparSql(logradouro)}', ${valorSql(
      limpar(endereco?.numero),
    )}, ${valorSql(limpar(endereco?.complemento))}, ${valorSql(limpar(endereco?.cep))}, ${valorSql(
      limpar(endereco?.telefone),
    )}, '${escaparSql(posto.bairro)}')`;
  });

  linhas.push(valoresPostos.join(",\n"));
  linhas.push(
    ") AS v(nome_fantasia, cnpj, logradouro, numero, complemento, cep, telefone, bairro)",
  );
  linhas.push("ON CONFLICT (cnpj) DO UPDATE SET");
  linhas.push("  nome_fantasia = EXCLUDED.nome_fantasia,");
  linhas.push("  endereco_logradouro = EXCLUDED.endereco_logradouro,");
  linhas.push("  endereco_numero = EXCLUDED.endereco_numero,");
  linhas.push("  endereco_complemento = EXCLUDED.endereco_complemento,");
  linhas.push("  endereco_cep = EXCLUDED.endereco_cep,");
  linhas.push("  telefone = COALESCE(EXCLUDED.telefone, posto.telefone),");
  linhas.push("  codigo_bairro = EXCLUDED.codigo_bairro;");
  linhas.push("");
  linhas.push("-- Coletas: cada celula de preco preenchida vira uma amostra");
  linhas.push(
    "INSERT INTO coleta (codigo_posto, codigo_combustivel, data_coleta, preco)",
  );
  linhas.push(
    "SELECT p.codigo_posto, c.codigo_combustivel, v.data_coleta::date, v.preco",
  );
  linhas.push("FROM (VALUES");

  const valoresColetas: string[] = [];
  for (const posto of postos) {
    for (const coleta of posto.coletas) {
      for (const [nomeCombustivel, preco] of coleta.precos) {
        valoresColetas.push(
          `  ('${escaparSql(posto.cnpj)}', '${escaparSql(nomeCombustivel)}', '${coleta.data}', ${preco.toFixed(3)})`,
        );
      }
    }
  }

  linhas.push(valoresColetas.join(",\n"));
  linhas.push(") AS v(cnpj, combustivel, data_coleta, preco)");
  linhas.push("JOIN posto p ON p.cnpj = v.cnpj");
  linhas.push("JOIN combustivel c ON c.nome = v.combustivel");
  linhas.push("ON CONFLICT (codigo_posto, codigo_combustivel, data_coleta)");
  linhas.push("DO UPDATE SET preco = EXCLUDED.preco;");
  linhas.push("");
  linhas.push("COMMIT;");
  linhas.push("");
  linhas.push("-- Conferencia da carga");
  linhas.push(
    "SELECT p.nome_fantasia AS posto, COUNT(*) AS amostras, COUNT(DISTINCT col.data_coleta) AS datas",
  );
  linhas.push(
    "FROM coleta col JOIN posto p ON p.codigo_posto = col.codigo_posto",
  );
  linhas.push("GROUP BY p.nome_fantasia ORDER BY p.nome_fantasia;");
  linhas.push("");

  return `${linhas.join("\n")}`;
};

const conferirRequisitos = (
  postos: PostoColeta[],
  totalColetas: number,
): string[] => {
  const avisos: string[] = [];
  const bairros = new Set(postos.map((posto) => posto.bairro));

  if (postos.length < 5) {
    avisos.push(
      `apenas ${postos.length} postos cadastrados, o requisito II.a pede 5`,
    );
  }
  if (bairros.size < 2) {
    avisos.push(
      `apenas ${bairros.size} bairro(s), o requisito II.c pede no minimo 2`,
    );
  }

  for (const posto of postos) {
    const datas = new Set(posto.coletas.map((coleta) => coleta.data));
    if (datas.size < 5) {
      avisos.push(
        `${posto.nome}: ${datas.size} datas distintas, o requisito II.b pede no minimo 5`,
      );
    }
  }

  const combustiveisPresentes = new Set(
    postos.flatMap((posto) =>
      posto.coletas.flatMap((coleta) => [...coleta.precos.keys()]),
    ),
  );
  for (const combustivel of COMBUSTIVEIS) {
    if (!combustiveisPresentes.has(combustivel.nome)) {
      avisos.push(`${combustivel.nome} nao aparece em nenhuma coleta`);
    }
  }

  if (totalColetas === 0) avisos.push("nenhuma coleta foi gerada");

  return avisos;
};

const principal = async (): Promise<void> => {
  const conteudoColetas = await readFile(ARQUIVO_COLETAS, "utf8");
  const postos = lerColetas(conteudoColetas);
  const totalColetas = postos.reduce(
    (total, posto) =>
      total +
      posto.coletas.reduce((soma, coleta) => soma + coleta.precos.size, 0),
    0,
  );

  console.log(
    `Coleta lida: ${postos.length} postos, ${totalColetas} amostras de preco.`,
  );

  const usarCache = !revalidar && existsSync(ARQUIVO_ENDERECOS);
  const enderecos = new Map<string, EnderecoPosto>();

  if (usarCache) {
    const conteudo = await readFile(ARQUIVO_ENDERECOS, "utf8");
    for (const [cnpj, endereco] of lerEnderecosSalvos(conteudo))
      enderecos.set(cnpj, endereco);
    console.log(
      `Enderecos reaproveitados de ${ARQUIVO_ENDERECOS} (use --revalidar para atualizar).`,
    );
  }

  for (const posto of postos) {
    if (enderecos.has(posto.cnpj)) continue;
    console.log(`Consultando CNPJ ${posto.cnpj}...`);
    enderecos.set(posto.cnpj, await buscarEndereco(posto));
    await new Promise((resolver) => setTimeout(resolver, 300));
  }

  const listaEnderecos = postos.map((posto) => {
    const endereco = enderecos.get(posto.cnpj);
    if (endereco) return endereco;
    throw new Error(`Endereco ausente para o posto ${posto.nome}`);
  });

  await writeFile(
    ARQUIVO_ENDERECOS,
    `${montarCsvEnderecos(listaEnderecos)}\n`,
    "utf8",
  );
  await writeFile(ARQUIVO_SQL, montarSql(postos, enderecos), "utf8");

  console.log(`Escrito ${ARQUIVO_ENDERECOS}`);
  console.log(
    `Escrito ${ARQUIVO_SQL} (${totalColetas} INSERTs de coleta em uma unica instrucao)`,
  );

  for (const endereco of listaEnderecos) {
    if (!endereco.logradouro) {
      console.warn(
        `Sem endereco para ${endereco.nomeFantasia}: ajuste ${ARQUIVO_ENDERECOS}.`,
      );
    }
    if (
      endereco.bairro &&
      endereco.bairroColeta &&
      endereco.bairro !== endereco.bairroColeta
    ) {
      console.warn(
        `${endereco.nomeFantasia}: bairro da Receita (${endereco.bairro}) difere do bairro coletado (${endereco.bairroColeta}).`,
      );
    }
  }

  const avisos = conferirRequisitos(postos, totalColetas);
  if (avisos.length === 0) {
    console.log("Requisitos II.a, II.b e II.c conferidos sem pendencias.");
    return;
  }
  for (const aviso of avisos) console.warn(`Atencao: ${aviso}`);
};

await principal();
