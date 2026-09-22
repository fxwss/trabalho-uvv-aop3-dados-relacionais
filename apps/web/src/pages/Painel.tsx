import { Link } from "react-router-dom";
import {
  compararCombustivel,
  formatData,
  formatDataLonga,
  formatMoeda,
} from "@precos/shared";
import type { EvolucaoMedia, ResumoAtual } from "@precos/shared";
import { BotaoCompartilhar } from "../components/BotaoCompartilhar.tsx";
import { CartaoMetrica } from "../components/CartaoMetrica.tsx";
import { EstadoCarregando } from "../components/EstadoCarregando.tsx";
import { EstadoErro } from "../components/Estados.tsx";
import { GraficoLinha } from "../components/GraficoLinha.tsx";
import { useCatalogo, useConsulta } from "../hooks/consultas.ts";
import { corCombustivel } from "../lib/cores.ts";
import { pivotarSeries } from "../lib/series.ts";

const ATALHOS = [
  {
    para: "/consulta-1",
    requisito: "II.d.I",
    titulo: "Menor e maior preço",
    texto:
      "Quanto custa o litro mais barato e o mais caro de cada combustível, com posto e data.",
  },
  {
    para: "/consulta-2",
    requisito: "II.d.II",
    titulo: "Preço médio e amostras",
    texto:
      "Preço médio de cada posto por combustível e quantas coletas sustentam essa média.",
  },
  {
    para: "/consulta-3",
    requisito: "II.d.III",
    titulo: "Preço mais recente",
    texto:
      "O valor praticado hoje em cada posto, direto da coleta mais recente.",
  },
  {
    para: "/consulta-4",
    requisito: "II.d.IV",
    titulo: "Evolução do preço",
    texto:
      "A série histórica de um combustível em um posto escolhido, na ordem das coletas.",
  },
  {
    para: "/planilhas",
    requisito: "II.e",
    titulo: "Planilhas e gráficos",
    texto:
      "Gráficos de evolução do preço médio e download de todas as consultas em CSV e XLSX.",
  },
  {
    para: "/postos",
    requisito: "II.a a II.c",
    titulo: "Postos e bairros",
    texto:
      "Comparador entre postos, com endereço, bairro e o último preço de cada combustível.",
  },
];

const Painel = () => {
  const catalogo = useCatalogo();
  const resumo = useConsulta("resumo-atual");
  const evolucao = useConsulta("media-evolucao");

  if (catalogo.isPending || resumo.isPending || evolucao.isPending) {
    return <EstadoCarregando linhas={6} />;
  }

  if (catalogo.isError || resumo.isError || evolucao.isError) {
    const erro = catalogo.error ?? resumo.error ?? evolucao.error;
    return (
      <EstadoErro
        aoTentarNovamente={() => {
          void catalogo.refetch();
          void resumo.refetch();
          void evolucao.refetch();
        }}
        detalhe={erro instanceof Error ? erro.message : undefined}
        mensagem="Não foi possível carregar o painel."
      />
    );
  }

  const meta = catalogo.data.meta;
  const ultimoPorCombustivel = new Map(
    (resumo.data.linhas as unknown as ResumoAtual[]).map((linha) => [
      linha.combustivel,
      linha,
    ]),
  );
  const combustiveis = [...catalogo.data.combustiveis].sort((a, b) =>
    compararCombustivel(a.nome, b.nome),
  );
  const { dados, series } = pivotarSeries(
    (evolucao.data.linhas as unknown as EvolucaoMedia[]).map((linha) => ({
      dataColeta: linha.dataColeta,
      nomeSerie: linha.combustivel,
      valor: linha.precoMedio,
    })),
    corCombustivel,
  );

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs font-semibold tracking-wide text-marca-700 uppercase">
          Divulgação dos preços coletados
        </p>
        <h1 className="mt-1 text-3xl font-semibold">
          Combustíveis em {meta.cidade}/{meta.uf}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Preços coletados em {meta.totalPostos} postos de {meta.totalBairros}{" "}
          bairros, entre {formatDataLonga(meta.primeiraColeta)} e{" "}
          {formatDataLonga(meta.ultimaColeta)}, totalizando {meta.totalColetas}{" "}
          amostras de {meta.totalCombustiveis} tipos de combustível.
        </p>
        <div className="nao-imprimir mt-4">
          <BotaoCompartilhar texto="Veja os preços dos combustíveis em Vila Velha/ES:" />
        </div>
      </section>

      <section aria-labelledby="titulo-ultima-coleta">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold" id="titulo-ultima-coleta">
            Preços da coleta mais recente
          </h2>
          <p className="text-xs text-slate-500">
            Menor, maior e média entre os postos na mesma data de coleta
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {combustiveis.map((combustivel) => {
            const linha = ultimoPorCombustivel.get(combustivel.nome);
            const cor = corCombustivel(combustivel.nome);

            if (!linha) {
              return (
                <CartaoMetrica
                  cor={cor}
                  descricao="Nenhum posto informou este combustível na data da coleta mais recente"
                  key={combustivel.nome}
                  titulo={combustivel.nome}
                  valor="sem coleta"
                />
              );
            }

            const amplitude = linha.maiorPreco - linha.menorPreco;
            return (
              <CartaoMetrica
                cor={cor}
                descricao={`${formatData(linha.dataColeta)} · ${linha.quantidadeAmostras} posto(s)`}
                key={combustivel.nome}
                rodape={`Menor ${formatMoeda(linha.menorPreco)} · maior ${formatMoeda(linha.maiorPreco)} · diferença ${formatMoeda(amplitude)}`}
                titulo={`${combustivel.nome} (média)`}
                valor={formatMoeda(linha.precoMedio)}
              />
            );
          })}
        </div>
      </section>

      <section aria-labelledby="titulo-evolucao" className="cartao p-4">
        <div className="mb-3">
          <h2 className="text-lg font-semibold" id="titulo-evolucao">
            Evolução do preço médio de cada combustível
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Média entre os postos monitorados, por data de coleta. É o primeiro
            gráfico exigido na divulgação do item II.e.
          </p>
        </div>
        <GraficoLinha
          altura={360}
          dados={dados}
          eixoX="dataColeta"
          nomeArquivoPng="evolucao-preco-medio-combustiveis"
          series={series}
          titulo="Preço por litro, em reais"
        />
      </section>

      <section aria-labelledby="titulo-consultas">
        <h2 className="mb-3 text-lg font-semibold" id="titulo-consultas">
          Consultas disponíveis
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ATALHOS.map((atalho) => (
            <Link
              className="cartao block p-4 transition hover:border-marca-400 hover:shadow-md"
              key={atalho.para}
              to={atalho.para}
            >
              <p className="text-xs font-semibold tracking-wide text-marca-700 uppercase">
                {atalho.requisito}
              </p>
              <h3 className="mt-1 font-semibold">{atalho.titulo}</h3>
              <p className="mt-1 text-sm text-slate-600">{atalho.texto}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="cartao p-4 text-sm text-slate-600">
        <h2 className="font-semibold text-slate-900">Como usar no dia a dia</h2>
        <p className="mt-1">
          As páginas de consulta e de planilhas podem ser impressas com Ctrl+P
          para virar cartaz em mural de igreja, associação de bairro ou comércio
          local. Os botões de compartilhamento enviam o link direto para o grupo
          da família ou do bairro.
        </p>
      </section>
    </div>
  );
};

export default Painel;
