import { CONSULTAS, formatDataLonga, formatNumero } from "@precos/shared";
import { CartaoMetrica } from "../components/CartaoMetrica.tsx";
import { EstadoCarregando } from "../components/EstadoCarregando.tsx";
import { EstadoErro } from "../components/Estados.tsx";
import { PainelSql } from "../components/PainelSql.tsx";
import { useCatalogo } from "../hooks/consultas.ts";

const ATENDIMENTO = [
  {
    requisito: "II.a",
    exigencia: "Coleta em pelo menos 5 postos, com 4 tipos de combustível",
    onde: "6 postos, 5 tipos coletados e 136 amostras de preço",
  },
  {
    requisito: "II.b",
    exigencia: "Mínimo de 5 coletas de cada posto, sempre em datas diferentes",
    onde: "A consulta II mostra as amostras por posto e a lista de datas por posto está na planilha",
  },
  {
    requisito: "II.c",
    exigencia: "Postos em pelo menos 2 bairros da cidade",
    onde: "6 bairros, visíveis no comparador de postos e no filtro por bairro",
  },
  {
    requisito: "II.d.I",
    exigencia: "Menor e maior preço de cada combustível",
    onde: 'Página "Menor e maior preço"',
  },
  {
    requisito: "II.d.II",
    exigencia: "Quantidade de amostras e preço médio por posto e combustível",
    onde: 'Página "Média e amostras"',
  },
  {
    requisito: "II.d.III",
    exigencia: "Preço mais recente por posto e combustível",
    onde: 'Página "Preço mais recente"',
  },
  {
    requisito: "II.d.IV",
    exigencia: "Evolução do preço de um combustível em um posto",
    onde: 'Página "Evolução", com seleção de posto e combustível',
  },
  {
    requisito: "II.e",
    exigencia:
      "Planilhas com os dados das consultas e dois gráficos de evolução do preço médio",
    onde: 'Página "Planilhas e gráficos", com download em CSV e XLSX',
  },
];

const Metodologia = () => {
  const catalogo = useCatalogo();

  if (catalogo.isPending) return <EstadoCarregando linhas={5} />;

  if (catalogo.isError) {
    return (
      <EstadoErro
        aoTentarNovamente={() => void catalogo.refetch()}
        detalhe={
          catalogo.error instanceof Error ? catalogo.error.message : undefined
        }
        mensagem="Não foi possível carregar o resumo do projeto."
      />
    );
  }

  const meta = catalogo.data.meta;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs font-semibold tracking-wide text-marca-700 uppercase">
          Sobre os dados
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          Metodologia da coleta e do site
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Os preços foram coletados diretamente nos postos de {meta.cidade}/
          {meta.uf}, sempre em visitas distintas, e armazenados em banco
          relacional PostgreSQL em terceira forma normal. Este site é a etapa de
          divulgação para a comunidade: ele não guarda dados novos, apenas
          consulta o banco e apresenta o resultado de forma legível.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CartaoMetrica
          descricao={`${meta.primeiraColeta} a ${meta.ultimaColeta}`}
          titulo="Período coletado"
          valor={`${formatNumero(meta.totalColetas)} amostras`}
        />
        <CartaoMetrica
          descricao="Postos visitados e cadastrados"
          titulo="Postos"
          valor={formatNumero(meta.totalPostos)}
        />
        <CartaoMetrica
          descricao="Bairros atendidos pela coleta"
          titulo="Bairros"
          valor={formatNumero(meta.totalBairros)}
        />
        <CartaoMetrica
          descricao="Gasolina, gasolina aditivada, etanol, diesel comum e diesel S10"
          titulo="Combustíveis"
          valor={formatNumero(meta.totalCombustiveis)}
        />
      </section>

      <section className="cartao overflow-hidden">
        <h2 className="cartao-titulo">Onde cada requisito aparece no site</h2>
        <div className="overflow-x-auto">
          <table className="tabela">
            <caption className="sr-only">
              Relação entre requisitos do trabalho e telas do site
            </caption>
            <thead>
              <tr>
                <th scope="col">Requisito</th>
                <th scope="col">Exigência</th>
                <th scope="col">Onde conferir</th>
              </tr>
            </thead>
            <tbody>
              {ATENDIMENTO.map((item) => (
                <tr key={item.requisito}>
                  <td className="font-semibold whitespace-nowrap">
                    {item.requisito}
                  </td>
                  <td>{item.exigencia}</td>
                  <td className="text-slate-600">{item.onde}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">
          Consultas SQL usadas na divulgação
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Cada tela do site executa exatamente as consultas abaixo, direto no
          banco PostgreSQL criado no projeto físico. Os mesmos comandos ficam
          visíveis dentro de cada página.
        </p>
        <div className="mt-4 space-y-3">
          {CONSULTAS.map((consulta) => (
            <div className="cartao overflow-hidden" key={consulta.id}>
              <div className="px-4 py-3">
                <p className="text-xs font-semibold tracking-wide text-marca-700 uppercase">
                  {consulta.requisito}
                </p>
                <h3 className="font-semibold">{consulta.titulo}</h3>
                <p className="text-sm text-slate-600">{consulta.descricao}</p>
              </div>
              <PainelSql requisito={consulta.requisito} sql={consulta.sql} />
            </div>
          ))}
        </div>
      </section>

      <section className="cartao p-4">
        <h2 className="font-semibold text-slate-900">
          Observações que a comunidade deve saber
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>
            Os valores são amostras do preço praticado na data da coleta.
            Promoções de um dia e mudanças de tabela podem não aparecer aqui.
          </li>
          <li>
            O diesel comum aparece em menos postos e em menos datas que os
            outros combustíveis, por isso pode ficar fora da coleta mais
            recente.
          </li>
          <li>
            Os preços médios são calculados por média aritmética simples das
            amostras do período indicado em cada tela.
          </li>
          <li>
            Os endereços foram conferidos na base pública de CNPJ, usando o CNPJ
            informado no cadastro de cada posto.
          </li>
          <li>
            Período coberto: de {formatDataLonga(meta.primeiraColeta)} a{" "}
            {formatDataLonga(meta.ultimaColeta)}.
          </li>
        </ul>
      </section>

      <section className="cartao p-4">
        <h2 className="font-semibold text-slate-900">Como o site é montado</h2>
        <p className="mt-1 text-sm text-slate-600">
          O site é uma aplicação React com TypeScript, servida por nginx em um
          contêiner Docker. A API em Node.js executa as consultas SQL no
          PostgreSQL e devolve JSON para a interface, que desenha as tabelas e
          os gráficos. Todo o conjunto sobe com um único comando
          <span className="numero mx-1 rounded bg-slate-100 px-1">
            docker compose up -d --build
          </span>
          a partir do repositório do projeto.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Integrantes: Erick Marques, Lucas Tejada Fabres e Thiago Tejada
          Fabres.
        </p>
      </section>
    </div>
  );
};

export default Metodologia;
