import { formatData, formatMoeda, formatNumero } from "@precos/shared";
import type { ConsultaUltimoPreco, PostoDetalhe } from "@precos/shared";
import { CartaoMetrica } from "../components/CartaoMetrica.tsx";
import { EstadoCarregando } from "../components/EstadoCarregando.tsx";
import { EstadoErro } from "../components/Estados.tsx";
import { SeletorBairro, SeletorCombustivel } from "../components/Seletores.tsx";
import { TabelaConsulta } from "../components/TabelaConsulta.tsx";
import { useCatalogo, useConsulta } from "../hooks/consultas.ts";
import { formatTelefone, montarEndereco } from "../lib/formato.ts";
import { useFiltros } from "../store/filtros.ts";

interface LinhaPosto {
  posto: string;
  bairro: string;
  endereco: string;
  telefone: string;
  preco: string;
  amostras: string;
  ultimaColeta: string;
}

/** Coluna auxiliar usada so para ordenar por preco, nunca exibida na tabela. */
interface PostoComPreco extends LinhaPosto {
  ordenacaoPreco: number;
}

const COLUNAS = [
  { chave: "posto", titulo: "Posto", formato: "texto" as const },
  { chave: "bairro", titulo: "Bairro", formato: "texto" as const },
  { chave: "endereco", titulo: "Endereço", formato: "texto" as const },
  { chave: "telefone", titulo: "Telefone", formato: "texto" as const },
  { chave: "preco", titulo: "Preço mais recente", formato: "texto" as const },
  { chave: "amostras", titulo: "Amostras", formato: "texto" as const },
  { chave: "ultimaColeta", titulo: "Última coleta", formato: "texto" as const },
];

const Postos = () => {
  const catalogo = useCatalogo();
  const { bairro, combustivelId, definirBairro, definirCombustivel } =
    useFiltros();
  const parametros = combustivelId ? { combustivel: combustivelId } : {};
  const ultimos = useConsulta("ultimo-preco", parametros);

  if (catalogo.isPending) return <EstadoCarregando linhas={6} />;

  if (catalogo.isError) {
    return (
      <EstadoErro
        aoTentarNovamente={() => void catalogo.refetch()}
        detalhe={
          catalogo.error instanceof Error ? catalogo.error.message : undefined
        }
        mensagem="Não foi possível carregar o cadastro de postos."
      />
    );
  }

  const postos = bairro
    ? catalogo.data.postos.filter((posto) => posto.bairro === bairro)
    : catalogo.data.postos;

  const precoPorPosto = new Map(
    ((ultimos.data?.linhas ?? []) as unknown as ConsultaUltimoPreco[]).map(
      (linha) => [linha.posto, linha],
    ),
  );

  const linhas: PostoComPreco[] = postos.map((posto: PostoDetalhe) => {
    const ultimo = precoPorPosto.get(posto.nomeFantasia);
    return {
      posto: posto.nomeFantasia,
      bairro: posto.bairro,
      endereco: montarEndereco(posto.logradouro, posto.numero, posto.bairro),
      telefone: formatTelefone(posto.telefone),
      preco: ultimo ? formatMoeda(ultimo.preco) : "sem coleta",
      amostras: formatNumero(posto.quantidadeColetas),
      ultimaColeta: posto.ultimaColeta ? formatData(posto.ultimaColeta) : "-",
      ordenacaoPreco: ultimo ? ultimo.preco : Number.POSITIVE_INFINITY,
    };
  });

  const linhasOrdenadas = combustivelId
    ? [...linhas].sort((a, b) => a.ordenacaoPreco - b.ordenacaoPreco)
    : linhas;

  return (
    <div className="space-y-6">
      <section>
        <p className="nao-imprimir text-xs font-semibold tracking-wide text-marca-700 uppercase">
          Requisitos II.a a II.c
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          Postos e bairros monitorados
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Cadastro dos postos que participaram da coleta, com endereço conferido
          na base pública de CNPJ. Com um combustível selecionado, a lista fica
          ordenada do menor para o maior preço mais recente, o que ajuda a
          escolher onde abastecer.
        </p>

        <div className="nao-imprimir mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SeletorCombustivel
            aoMudar={definirCombustivel}
            combustiveis={catalogo.data.combustiveis}
            valor={combustivelId}
          />
          <SeletorBairro
            aoMudar={definirBairro}
            bairros={catalogo.data.bairros}
            valor={bairro}
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <CartaoMetrica
          descricao="Postos exibidos na tabela"
          rodape={
            bairro ? `Filtrado pelo bairro ${bairro}` : "Todos os bairros"
          }
          titulo="Postos exibidos"
          valor={formatNumero(postos.length)}
        />
        <CartaoMetrica
          descricao="Bairros atendidos pela coleta"
          titulo="Bairros"
          valor={formatNumero(catalogo.data.meta.totalBairros)}
        />
        <CartaoMetrica
          descricao="Amostras de preço somadas nos postos exibidos"
          titulo="Amostras"
          valor={formatNumero(
            postos.reduce((soma, posto) => soma + posto.quantidadeColetas, 0),
          )}
        />
      </section>

      <section className="cartao overflow-hidden">
        <h2 className="cartao-titulo">
          {combustivelId
            ? "Postos ordenados pelo preço mais recente"
            : "Cadastro dos postos"}
        </h2>
        {ultimos.isError ? (
          <p className="px-4 py-3 text-sm text-amber-700">
            Não foi possível carregar os preços mais recentes. A tabela abaixo
            mostra apenas o cadastro.
          </p>
        ) : null}
        <TabelaConsulta
          colunas={COLUNAS}
          linhas={linhasOrdenadas as unknown as Record<string, unknown>[]}
          rotuloTabela="Postos monitorados com endereço e preço mais recente"
        />
      </section>
    </div>
  );
};

export default Postos;
