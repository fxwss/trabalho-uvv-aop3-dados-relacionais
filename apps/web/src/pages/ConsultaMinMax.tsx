import { formatMoeda } from "@precos/shared";
import type {
  ColunaConsulta,
  ConsultaMinMax as LinhaMinMax,
} from "@precos/shared";
import { CabecalhoConsulta } from "../components/CabecalhoConsulta.tsx";
import { CartaoMetrica } from "../components/CartaoMetrica.tsx";
import { EstadoCarregando } from "../components/EstadoCarregando.tsx";
import { EstadoErro, EstadoVazio } from "../components/Estados.tsx";
import { EtiquetaCombustivel, EtiquetaTipo } from "../components/Etiquetas.tsx";
import { SeletorCombustivel } from "../components/Seletores.tsx";
import {
  TabelaConsulta,
  type LinhaTabela,
} from "../components/TabelaConsulta.tsx";
import { useCatalogo, useConsulta } from "../hooks/consultas.ts";
import { corCombustivel } from "../lib/cores.ts";
import { useFiltros } from "../store/filtros.ts";

const ConsultaMinMax = () => {
  const catalogo = useCatalogo();
  const { combustivelId, definirCombustivel } = useFiltros();
  const parametros = combustivelId ? { combustivel: combustivelId } : {};
  const consulta = useConsulta("min-max", parametros);

  const linhas = (consulta.data?.linhas ?? []) as unknown as LinhaMinMax[];

  const amplitudes = new Map<string, LinhaMinMax[]>();
  for (const linha of linhas) {
    const lista = amplitudes.get(linha.combustivel) ?? [];
    lista.push(linha);
    amplitudes.set(linha.combustivel, lista);
  }

  return (
    <div>
      <CabecalhoConsulta
        descricao="Para cada tipo de combustível, a coleta de menor preço e a de maior preço entre todos os postos monitorados, com nome do posto, endereço, bairro, valor e data da coleta."
        idConsulta="min-max"
        parametros={parametros}
        requisito="II.d.I"
        sql={consulta.data?.consulta.sql}
        titulo="Menor e maior preço por combustível"
        total={consulta.data?.total}
      >
        <SeletorCombustivel
          aoMudar={definirCombustivel}
          combustiveis={catalogo.data?.combustiveis ?? []}
          valor={combustivelId}
        />
      </CabecalhoConsulta>

      {amplitudes.size > 0 ? (
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...amplitudes.entries()].map(([combustivel, itens]) => {
            const menor = itens.find((item) => item.tipo === "MENOR");
            const maior = itens.find((item) => item.tipo === "MAIOR");
            if (!menor || !maior) return null;
            return (
              <CartaoMetrica
                cor={corCombustivel(combustivel)}
                descricao={`Menor em ${menor.posto} · maior em ${maior.posto}`}
                key={combustivel}
                rodape={`Amplitude de ${formatMoeda(maior.preco - menor.preco)} por litro`}
                titulo={combustivel}
                valor={`${formatMoeda(menor.preco)} a ${formatMoeda(maior.preco)}`}
              />
            );
          })}
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
            linhas={consulta.data.linhas}
            renderValor={(coluna: ColunaConsulta, linha: LinhaTabela) => {
              if (coluna.chave === "tipo")
                return <EtiquetaTipo tipo={String(linha.tipo)} />;
              if (coluna.chave === "combustivel") {
                return <EtiquetaCombustivel nome={String(linha.combustivel)} />;
              }
              return null;
            }}
            rotuloTabela="Menor e maior preço por tipo de combustível"
          />
        ) : null}
      </section>
    </div>
  );
};

export default ConsultaMinMax;
