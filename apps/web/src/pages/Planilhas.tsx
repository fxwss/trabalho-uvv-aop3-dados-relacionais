import { useState } from "react";
import { CONSULTAS, compararCombustivel, formatNumero } from "@precos/shared";
import type { EvolucaoMedia, EvolucaoMediaPosto } from "@precos/shared";
import { BotoesExportar } from "../components/BotoesExportar.tsx";
import { EstadoCarregando } from "../components/EstadoCarregando.tsx";
import { EstadoErro } from "../components/Estados.tsx";
import { GraficoLinha } from "../components/GraficoLinha.tsx";
import { SeletorCombustivel } from "../components/Seletores.tsx";
import { useCatalogo, useConsulta } from "../hooks/consultas.ts";
import { urlPlanilhaCompleta } from "../lib/api.ts";
import { corCombustivel, corPosto } from "../lib/cores.ts";
import { pivotarSeries } from "../lib/series.ts";
import { useFiltros } from "../store/filtros.ts";

const CONSULTAS_EXPORTAVEIS = CONSULTAS.filter(
  (consulta) => consulta.id !== "resumo-atual" && consulta.id !== "evolucao",
);

const Planilhas = () => {
  const catalogo = useCatalogo();
  const { combustivelId, definirCombustivel } = useFiltros();
  const parametros = combustivelId ? { combustivel: combustivelId } : {};

  const mediaGeral = useConsulta("media-evolucao", parametros);
  const [combustivelDoGrafico, definirCombustivelDoGrafico] = useState<
    number | null
  >(null);

  const combustivelPadrao =
    combustivelDoGrafico ??
    [...(catalogo.data?.combustiveis ?? [])].sort((a, b) =>
      compararCombustivel(a.nome, b.nome),
    )[0]?.codigo ??
    null;

  const mediaPorPosto = useConsulta(
    "media-evolucao-posto",
    combustivelPadrao ? { combustivel: combustivelPadrao } : {},
  );

  const carregando = mediaGeral.isPending || mediaPorPosto.isPending;
  const comErro = mediaGeral.isError || mediaPorPosto.isError;

  const nomeCombustivelDoGrafico =
    catalogo.data?.combustiveis.find(
      (item) => item.codigo === combustivelPadrao,
    )?.nome ?? "";

  const geral = pivotarSeries(
    ((mediaGeral.data?.linhas ?? []) as unknown as EvolucaoMedia[]).map(
      (linha) => ({
        dataColeta: linha.dataColeta,
        nomeSerie: linha.combustivel,
        valor: linha.precoMedio,
      }),
    ),
    corCombustivel,
  );

  const porPosto = pivotarSeries(
    ((mediaPorPosto.data?.linhas ?? []) as unknown as EvolucaoMediaPosto[]).map(
      (linha) => ({
        dataColeta: linha.dataColeta,
        nomeSerie: linha.posto,
        valor: linha.precoMedio,
      }),
    ),
    (_nome, indice) => corPosto(indice),
    false,
  );

  return (
    <div className="space-y-8">
      <section>
        <p className="nao-imprimir text-xs font-semibold tracking-wide text-marca-700 uppercase">
          Requisito II.e
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          Planilhas e gráficos para divulgação à comunidade
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Os gráficos abaixo mostram a evolução do preço médio de cada
          combustível e a evolução por posto. Cada consulta pode ser baixada em
          CSV (abre em qualquer planilha) e em XLSX. Use o botão de imprimir
          para levar o resultado ao mural da igreja, da associação de bairro ou
          do comércio.
        </p>

        <div className="nao-imprimir mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SeletorCombustivel
            aoMudar={definirCombustivel}
            combustiveis={catalogo.data?.combustiveis ?? []}
            valor={combustivelId}
          />
          <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-end gap-2">
            <a className="botao-primario" download href={urlPlanilhaCompleta()}>
              Baixar planilha completa (XLSX)
            </a>
            <button
              className="botao"
              onClick={() => window.print()}
              type="button"
            >
              Imprimir ou salvar em PDF
            </button>
          </div>
        </div>
      </section>

      {carregando ? <EstadoCarregando linhas={8} /> : null}

      {comErro ? (
        <EstadoErro
          aoTentarNovamente={() => {
            void mediaGeral.refetch();
            void mediaPorPosto.refetch();
          }}
          detalhe={
            (mediaGeral.error ?? mediaPorPosto.error) instanceof Error
              ? String(mediaGeral.error ?? mediaPorPosto.error)
              : undefined
          }
          mensagem="Não foi possível carregar os gráficos."
        />
      ) : null}

      {!carregando && !comErro ? (
        <>
          <section className="cartao p-4">
            <div className="mb-3">
              <p className="text-xs font-semibold tracking-wide text-marca-700 uppercase">
                II.e.I
              </p>
              <h2 className="text-lg font-semibold">
                Evolução do preço médio de cada combustível
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Média entre todos os postos monitorados, em cada data de coleta.
              </p>
            </div>
            <GraficoLinha
              altura={400}
              dados={geral.dados}
              eixoX="dataColeta"
              nomeArquivoPng="iie-1-evolucao-preco-medio-combustiveis"
              series={geral.series}
              titulo="Preço por litro, em reais"
            />
          </section>

          <section className="cartao p-4">
            <div className="mb-3">
              <p className="text-xs font-semibold tracking-wide text-marca-700 uppercase">
                II.e.II
              </p>
              <h2 className="text-lg font-semibold">
                Evolução do preço médio de cada combustível em cada posto
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Uma linha por posto, mostrando a evolução do preço médio do
                combustível escolhido abaixo. Cada linha permite comparar como o
                preço se moveu em cada bairro ao longo das coletas.
              </p>
              <div className="nao-imprimir mt-3 max-w-xs">
                <SeletorCombustivel
                  aoMudar={(id) => definirCombustivelDoGrafico(id)}
                  combustiveis={catalogo.data?.combustiveis ?? []}
                  incluirTodos={false}
                  valor={combustivelPadrao}
                />
              </div>
            </div>
            <GraficoLinha
              altura={420}
              dados={porPosto.dados}
              eixoX="dataColeta"
              nomeArquivoPng="iie-2-evolucao-preco-medio-por-posto"
              series={porPosto.series}
              titulo={`Preço médio por litro, em reais${nomeCombustivelDoGrafico ? ` (${nomeCombustivelDoGrafico})` : ""}`}
            />
          </section>

          <section className="cartao overflow-hidden">
            <h2 className="cartao-titulo">Arquivos desta divulgação</h2>
            <ul className="divide-y divide-slate-100">
              {CONSULTAS_EXPORTAVEIS.map((consulta) => {
                const linhas =
                  consulta.id === "media-evolucao"
                    ? geral.dados.length
                    : undefined;
                return (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    key={consulta.id}
                  >
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-marca-700 uppercase">
                        {consulta.requisito}
                      </p>
                      <p className="font-medium text-slate-800">
                        {consulta.titulo}
                      </p>
                      <p className="text-xs text-slate-500">
                        {consulta.descricao}
                      </p>
                      {linhas !== undefined ? (
                        <p className="text-xs text-slate-500">
                          {formatNumero(linhas)} datas no gráfico
                        </p>
                      ) : null}
                    </div>
                    <div className="nao-imprimir">
                      <BotoesExportar
                        id={consulta.id}
                        parametros={parametros}
                        compacto
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              A planilha completa reúne todas as abas acima mais o cadastro de
              postos, a média por combustível e as observações de metodologia. A
              consulta IV é feita por posto e combustível na página{" "}
              <span className="font-medium">Evolução</span>, com download
              próprio.
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
};

export default Planilhas;
