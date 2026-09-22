import { useRef } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ORDEM_COMBUSTIVEIS,
  formatData,
  formatDataLonga,
  formatMoeda,
  formatMoedaCurta,
} from "@precos/shared";
import { baixarGraficoPng } from "../lib/grafico.ts";

export interface SerieGrafico {
  chave: string;
  nome: string;
  cor: string;
}

interface Props {
  dados: Record<string, string | number>[];
  eixoX: string;
  series: SerieGrafico[];
  altura?: number;
  nomeArquivoPng?: string;
  titulo: string;
}

/**
 * O itemSorter mantem a ordem canonica (gasolina, aditivada, etanol, diesel)
 * na dica de contexto, em vez da ordem alfabetica que a biblioteca usaria.
 */
const ordenarItemDoTooltip = (item: { name?: string | number }): string => {
  const nome = String(item.name ?? "");
  const indice = ORDEM_COMBUSTIVEIS.indexOf(
    nome as (typeof ORDEM_COMBUSTIVEIS)[number],
  );
  if (indice === -1) return nome;
  return String(indice).padStart(2, "0");
};

/** Legenda propria para preservar a ordem das series definida pelo site. */
const Legenda = ({ series }: { series: SerieGrafico[] }) => (
  <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
    {series.map((serie) => (
      <li className="flex items-center gap-1.5" key={serie.chave}>
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: serie.cor }}
        />
        <span className="text-slate-600">{serie.nome}</span>
      </li>
    ))}
  </ul>
);

export const GraficoLinha = ({
  dados,
  eixoX,
  series,
  altura = 380,
  nomeArquivoPng,
  titulo,
}: Props) => {
  const container = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div ref={container} style={{ height: altura }}>
        <ResponsiveContainer height="100%" width="100%">
          <LineChart
            data={dados}
            margin={{ top: 12, right: 24, bottom: 8, left: 8 }}
          >
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis
              dataKey={eixoX}
              tick={{ fontSize: 12 }}
              tickFormatter={(valor: string) => formatData(valor)}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fontSize: 12 }}
              tickFormatter={(valor: number) => formatMoedaCurta(valor)}
              width={78}
            />
            <Tooltip
              formatter={(valor) => formatMoeda(Number(valor))}
              itemSorter={ordenarItemDoTooltip}
              labelFormatter={(valor) => formatDataLonga(String(valor))}
            />
            <Legend content={<Legenda series={series} />} />
            {series.map((serie) => (
              <Line
                connectNulls
                dataKey={serie.chave}
                dot={{ r: 3 }}
                key={serie.chave}
                name={serie.nome}
                stroke={serie.cor}
                strokeWidth={2}
                type="monotone"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="nao-imprimir mt-3 flex flex-wrap items-center gap-2">
        <p className="text-xs text-slate-500">{titulo}</p>
        {nomeArquivoPng ? (
          <button
            className="botao"
            onClick={() =>
              void baixarGraficoPng(container.current, nomeArquivoPng)
            }
            type="button"
          >
            Baixar gráfico em PNG
          </button>
        ) : null}
      </div>
    </div>
  );
};
