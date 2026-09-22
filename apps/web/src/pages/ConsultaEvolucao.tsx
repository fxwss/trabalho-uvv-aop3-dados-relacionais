import { useSearchParams } from "react-router-dom";
import { compararCombustivel, formatData, formatMoeda } from "@precos/shared";
import type { ConsultaEvolucao as LinhaEvolucao } from "@precos/shared";
import { BotaoCompartilhar } from "../components/BotaoCompartilhar.tsx";
import { BotoesExportar } from "../components/BotoesExportar.tsx";
import { CartaoMetrica } from "../components/CartaoMetrica.tsx";
import { EstadoCarregando } from "../components/EstadoCarregando.tsx";
import { EstadoErro, EstadoVazio } from "../components/Estados.tsx";
import { GraficoLinha } from "../components/GraficoLinha.tsx";
import { PainelSql } from "../components/PainelSql.tsx";
import { SeletorCombustivel, SeletorPosto } from "../components/Seletores.tsx";
import { TabelaConsulta } from "../components/TabelaConsulta.tsx";
import { useCatalogo, useConsulta } from "../hooks/consultas.ts";
import { corCombustivel } from "../lib/cores.ts";
import { formatPercentual, variacaoPercentual } from "../lib/formato.ts";
import { useFiltros } from "../store/filtros.ts";

const ConsultaEvolucao = () => {
  const catalogo = useCatalogo();
  const { definirCombustivel } = useFiltros();
  const [busca, definirBusca] = useSearchParams();

  const postos = catalogo.data?.postos ?? [];
  const combustiveis = [...(catalogo.data?.combustiveis ?? [])].sort((a, b) =>
    compararCombustivel(a.nome, b.nome),
  );

  const postoDaUrl = Number(busca.get("posto"));
  const combustivelDaUrl = Number(busca.get("combustivel"));
  const postoId =
    Number.isInteger(postoDaUrl) && postoDaUrl > 0
      ? postoDaUrl
      : (postos[0]?.codigo ?? null);
  const combustivelId =
    Number.isInteger(combustivelDaUrl) && combustivelDaUrl > 0
      ? combustivelDaUrl
      : (combustiveis[0]?.codigo ?? null);

  const pronto = postoId !== null && combustivelId !== null;
  const consulta = useConsulta(
    "evolucao",
    { posto: postoId ?? "", combustivel: combustivelId ?? "" },
    pronto,
  );

  const linhas = (consulta.data?.linhas ?? []) as unknown as LinhaEvolucao[];
  const primeira = linhas[0];
  const ultima = linhas[linhas.length - 1];
  const nomeCombustivel =
    ultima?.combustivel ??
    combustiveis.find((item) => item.codigo === combustivelId)?.nome ??
    "";
  const variacao =
    primeira && ultima
      ? variacaoPercentual(ultima.preco, primeira.preco)
      : null;

  const selecionarPosto = (id: number): void => {
    const proximo = new URLSearchParams(busca);
    proximo.set("posto", String(id));
    proximo.set("combustivel", String(combustivelId ?? ""));
    definirBusca(proximo);
  };

  const selecionarCombustivel = (id: number | null): void => {
    if (id === null) return;
    definirCombustivel(id);
    const proximo = new URLSearchParams(busca);
    proximo.set("combustivel", String(id));
    proximo.set("posto", String(postoId ?? ""));
    definirBusca(proximo);
  };

  return (
    <div>
      <section className="mb-6">
        <p className="text-xs font-semibold tracking-wide text-marca-700 uppercase">
          Requisito II.d.IV
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          Evolução do preço de um combustível em um posto
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Escolha o posto e o combustível para ver a série histórica completa,
          ordenada pelas datas de coleta, com gráfico, tabela e comparativo
          entre a primeira e a última medição.
        </p>

        <div className="nao-imprimir mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SeletorPosto
            aoMudar={selecionarPosto}
            postos={postos}
            valor={postoId}
          />
          <SeletorCombustivel
            aoMudar={selecionarCombustivel}
            combustiveis={combustiveis}
            rotuloTodos="Selecione"
            valor={combustivelId}
          />
          {pronto ? (
            <div className="sm:col-span-2">
              <p className="rotulo">Divulgar este resultado</p>
              <div className="flex flex-wrap items-center gap-2">
                <BotaoCompartilhar
                  texto={`Evolução do preço da ${nomeCombustivel} no posto selecionado:`}
                />
                <BotoesExportar
                  compacto
                  id="evolucao"
                  parametros={{
                    posto: postoId ?? "",
                    combustivel: combustivelId ?? "",
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {consulta.data ? (
          <div className="nao-imprimir mt-4 overflow-hidden rounded-xl border border-slate-200">
            <PainelSql requisito="II.d.IV" sql={consulta.data.consulta.sql} />
          </div>
        ) : null}
      </section>

      {!pronto ? (
        <EstadoVazio mensagem="Carregando postos e combustíveis disponíveis." />
      ) : null}

      {consulta.isPending && pronto ? <EstadoCarregando linhas={5} /> : null}

      {consulta.isError ? (
        <EstadoErro
          aoTentarNovamente={() => void consulta.refetch()}
          detalhe={
            consulta.error instanceof Error ? consulta.error.message : undefined
          }
          mensagem="Não foi possível carregar a série histórica."
        />
      ) : null}

      {consulta.isSuccess && linhas.length === 0 ? (
        <EstadoVazio mensagem="Este posto não tem coleta registrada para o combustível escolhido. Tente outra combinação." />
      ) : null}

      {consulta.isSuccess && linhas.length > 0 && primeira && ultima ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-3">
            <CartaoMetrica
              descricao={`${formatData(primeira.dataColeta)} a ${formatData(ultima.dataColeta)}`}
              titulo="Amostras no período"
              valor={`${linhas.length} coletas`}
            />
            <CartaoMetrica
              descricao={`${formatMoeda(primeira.preco)} em ${formatData(primeira.dataColeta)}`}
              titulo="Preço mais recente"
              valor={formatMoeda(ultima.preco)}
            />
            <CartaoMetrica
              descricao="Comparação entre a primeira e a última coleta"
              rodape={`Menor ${formatMoeda(Math.min(...linhas.map((l) => l.preco)))} · maior ${formatMoeda(Math.max(...linhas.map((l) => l.preco)))}`}
              titulo="Variação no período"
              valor={variacao === null ? "-" : formatPercentual(variacao)}
            />
          </section>

          <section className="cartao p-4">
            <h2 className="mb-3 text-lg font-semibold">
              {nomeCombustivel} em {ultima.posto}
            </h2>
            <GraficoLinha
              altura={340}
              dados={linhas.map(
                (linha) =>
                  ({
                    dataColeta: linha.dataColeta,
                    [nomeCombustivel]: linha.preco,
                  }) as Record<string, string | number>,
              )}
              eixoX="dataColeta"
              nomeArquivoPng={`evolucao-${nomeCombustivel.toLowerCase().replace(/\s+/g, "-")}`}
              series={[
                {
                  chave: nomeCombustivel,
                  nome: nomeCombustivel,
                  cor: corCombustivel(nomeCombustivel),
                },
              ]}
              titulo="Preço por litro, em reais"
            />
          </section>

          <section className="cartao overflow-hidden">
            <h2 className="cartao-titulo">Coletas na ordem das datas</h2>
            <TabelaConsulta
              colunas={consulta.data.consulta.colunas}
              linhas={consulta.data.linhas}
              rotuloTabela={`Evolução do preço da ${nomeCombustivel}`}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default ConsultaEvolucao;
