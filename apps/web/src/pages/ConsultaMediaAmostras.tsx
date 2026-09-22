import { useState } from "react";
import { compararCombustivel, formatMoeda, formatNumero } from "@precos/shared";
import type {
  ColunaConsulta,
  ConsultaMediaAmostras as LinhaMedia,
} from "@precos/shared";
import { CabecalhoConsulta } from "../components/CabecalhoConsulta.tsx";
import { CartaoMetrica } from "../components/CartaoMetrica.tsx";
import { EstadoCarregando } from "../components/EstadoCarregando.tsx";
import { EstadoErro, EstadoVazio } from "../components/Estados.tsx";
import { EtiquetaCombustivel } from "../components/Etiquetas.tsx";
import { SeletorCombustivel } from "../components/Seletores.tsx";
import {
  TabelaConsulta,
  type LinhaTabela,
} from "../components/TabelaConsulta.tsx";
import { useCatalogo, useConsulta } from "../hooks/consultas.ts";
import { corCombustivel } from "../lib/cores.ts";
import { useFiltros } from "../store/filtros.ts";

type Ordem = "posto" | "preco" | "amostras";

const ordenar = (linhas: LinhaMedia[], ordem: Ordem): LinhaMedia[] => {
  if (ordem === "preco") {
    return [...linhas].sort((a, b) => a.precoMedio - b.precoMedio);
  }
  if (ordem === "amostras") {
    return [...linhas].sort(
      (a, b) => b.quantidadeAmostras - a.quantidadeAmostras,
    );
  }
  return [...linhas].sort(
    (a, b) =>
      a.posto.localeCompare(b.posto, "pt-BR") ||
      compararCombustivel(a.combustivel, b.combustivel),
  );
};

const ConsultaMediaAmostras = () => {
  const catalogo = useCatalogo();
  const { combustivelId, definirCombustivel } = useFiltros();
  const [ordem, definirOrdem] = useState<Ordem>("posto");
  const parametros = combustivelId ? { combustivel: combustivelId } : {};
  const consulta = useConsulta("media-amostras", parametros);

  const linhas = (consulta.data?.linhas ?? []) as unknown as LinhaMedia[];
  const linhasOrdenadas = ordenar(linhas, ordem);
  const totalAmostras = linhas.reduce(
    (soma, linha) => soma + linha.quantidadeAmostras,
    0,
  );
  const mediaGeral = linhas.length
    ? linhas.reduce((soma, linha) => soma + linha.precoMedio, 0) / linhas.length
    : 0;

  return (
    <div>
      <CabecalhoConsulta
        descricao="Para cada posto e cada tipo de combustível, quantas amostras de preço foram coletadas e qual o preço médio praticado no período. É a consulta que comprova o mínimo de coletas exigido."
        idConsulta="media-amostras"
        parametros={parametros}
        requisito="II.d.II"
        sql={consulta.data?.consulta.sql}
        titulo="Quantidade de amostras e preço médio"
        total={consulta.data?.total}
      >
        <SeletorCombustivel
          aoMudar={definirCombustivel}
          combustiveis={catalogo.data?.combustiveis ?? []}
          valor={combustivelId}
        />
        <div>
          <label className="rotulo" htmlFor="ordem-tabela">
            Ordenar por
          </label>
          <select
            className="campo"
            id="ordem-tabela"
            onChange={(evento) => definirOrdem(evento.target.value as Ordem)}
            value={ordem}
          >
            <option value="posto">Posto e combustível</option>
            <option value="preco">Menor preço médio</option>
            <option value="amostras">Mais amostras</option>
          </select>
        </div>
      </CabecalhoConsulta>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <CartaoMetrica
          descricao="Combinações de posto e combustível retornadas"
          titulo="Linhas da consulta"
          valor={formatNumero(linhas.length)}
        />
        <CartaoMetrica
          descricao="Soma das amostras das linhas exibidas"
          titulo="Amostras somadas"
          valor={formatNumero(totalAmostras)}
        />
        <CartaoMetrica
          descricao="Média simples dos preços médios exibidos"
          titulo="Média geral"
          valor={formatMoeda(mediaGeral)}
        />
      </section>

      {catalogo.data?.meta ? (
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalogo.data.meta.mediaPorCombustivel
            .slice()
            .sort((a, b) => compararCombustivel(a.combustivel, b.combustivel))
            .map((media) => (
              <CartaoMetrica
                cor={corCombustivel(media.combustivel)}
                descricao={`${formatNumero(media.quantidadeAmostras)} amostras em todo o período`}
                key={media.combustivel}
                titulo={`Média de ${media.combustivel}`}
                valor={formatMoeda(media.precoMedio)}
              />
            ))}
        </section>
      ) : null}

      <section className="cartao overflow-hidden">
        <h2 className="cartao-titulo">Resultado da consulta</h2>
        {consulta.isPending ? <EstadoCarregando /> : null}
        {consulta.isError ? (
          <EstadoErro
            aoTentarNovamente={() => void consulta.refetch()}
            detalhe={
              consulta.error instanceof Error
                ? consulta.error.message
                : undefined
            }
            mensagem="Não foi possível carregar a consulta."
          />
        ) : null}
        {consulta.isSuccess && linhas.length === 0 ? (
          <EstadoVazio mensagem="Nenhuma coleta encontrada para o filtro escolhido." />
        ) : null}
        {consulta.isSuccess && linhas.length > 0 ? (
          <TabelaConsulta
            colunas={consulta.data.consulta.colunas}
            linhas={linhasOrdenadas as unknown as LinhaTabela[]}
            renderValor={(coluna: ColunaConsulta, linha: LinhaTabela) => {
              if (coluna.chave === "combustivel") {
                return <EtiquetaCombustivel nome={String(linha.combustivel)} />;
              }
              return null;
            }}
            rotuloTabela="Preço médio e quantidade de amostras por posto e combustível"
          />
        ) : null}
      </section>
    </div>
  );
};

export default ConsultaMediaAmostras;
