import { formatData, formatMoeda } from "@precos/shared";
import type {
  ColunaConsulta,
  ConsultaUltimoPreco as LinhaUltimo,
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

const ConsultaUltimoPreco = () => {
  const catalogo = useCatalogo();
  const { combustivelId, definirCombustivel } = useFiltros();
  const parametros = combustivelId ? { combustivel: combustivelId } : {};
  const consulta = useConsulta("ultimo-preco", parametros);

  const linhas = (consulta.data?.linhas ?? []) as unknown as LinhaUltimo[];

  const porCombustivel = new Map<string, LinhaUltimo[]>();
  for (const linha of linhas) {
    const lista = porCombustivel.get(linha.combustivel) ?? [];
    lista.push(linha);
    porCombustivel.set(linha.combustivel, lista);
  }

  const maisBaratos = [...porCombustivel.entries()].map(
    ([combustivel, itens]) => {
      const ordenados = [...itens].sort((a, b) => a.preco - b.preco);
      return {
        combustivel,
        primeiro: ordenados[0],
        ultimo: ordenados[ordenados.length - 1],
      };
    },
  );

  return (
    <div>
      <CabecalhoConsulta
        descricao="Apenas a coleta mais recente de cada par posto e combustível. É o retrato de quanto o litro está custando agora em cada posto monitorado."
        idConsulta="ultimo-preco"
        parametros={parametros}
        requisito="II.d.III"
        sql={consulta.data?.consulta.sql}
        titulo="Preço mais recente por posto"
        total={consulta.data?.total}
      >
        <SeletorCombustivel
          aoMudar={definirCombustivel}
          combustiveis={catalogo.data?.combustiveis ?? []}
          valor={combustivelId}
        />
      </CabecalhoConsulta>

      {maisBaratos.length > 0 ? (
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {maisBaratos.map((item) => (
            <CartaoMetrica
              cor={corCombustivel(item.combustivel)}
              descricao={`Posto mais barato: ${item.primeiro?.posto ?? "-"} (${item.primeiro?.bairro ?? "-"})`}
              key={item.combustivel}
              rodape={
                item.primeiro && item.ultimo
                  ? `Mais caro: ${item.ultimo.posto} a ${formatMoeda(item.ultimo.preco)} · coleta de ${formatData(item.primeiro.dataColeta)}`
                  : undefined
              }
              titulo={`Menor preço de ${item.combustivel}`}
              valor={item.primeiro ? formatMoeda(item.primeiro.preco) : "-"}
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
            linhas={consulta.data.linhas}
            renderValor={(coluna: ColunaConsulta, linha: LinhaTabela) => {
              if (coluna.chave === "combustivel") {
                return <EtiquetaCombustivel nome={String(linha.combustivel)} />;
              }
              return null;
            }}
            rotuloTabela="Preço mais recente por posto e combustível"
          />
        ) : null}
      </section>
    </div>
  );
};

export default ConsultaUltimoPreco;
