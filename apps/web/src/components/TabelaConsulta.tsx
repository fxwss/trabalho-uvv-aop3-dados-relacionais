import type { ReactNode } from "react";
import { formatarValor } from "@precos/shared";
import type { ColunaConsulta } from "@precos/shared";

export type LinhaTabela = Record<string, unknown>;

interface Props {
  colunas: ColunaConsulta[];
  linhas: LinhaTabela[];
  rotuloTabela: string;
  renderValor?: (coluna: ColunaConsulta, linha: LinhaTabela) => ReactNode;
}

/**
 * Tabela de resultado que vira lista de cartoes no celular, para o dado continuar
 * legivel em telas estreitas sem rolagem horizontal.
 */
export const TabelaConsulta = ({
  colunas,
  linhas,
  rotuloTabela,
  renderValor,
}: Props) => {
  const conteudo = (coluna: ColunaConsulta, linha: LinhaTabela): ReactNode =>
    renderValor?.(coluna, linha) ??
    formatarValor(linha[coluna.chave], coluna.formato);

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="tabela">
          <caption className="sr-only">{rotuloTabela}</caption>
          <thead>
            <tr>
              {colunas.map((coluna) => (
                <th key={coluna.chave} scope="col">
                  {coluna.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, indice) => (
              <tr key={`linha-${String(indice)}`}>
                {colunas.map((coluna) => (
                  <td
                    className={
                      coluna.formato === "texto"
                        ? undefined
                        : "numero whitespace-nowrap"
                    }
                    key={coluna.chave}
                  >
                    {conteudo(coluna, linha)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {linhas.map((linha, indice) => (
          <li className="px-4 py-3" key={`cartao-${String(indice)}`}>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {colunas.map((coluna) => (
                <div
                  className="col-span-2 flex items-baseline justify-between gap-3"
                  key={coluna.chave}
                >
                  <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    {coluna.titulo}
                  </dt>
                  <dd className="numero text-right font-medium text-slate-800">
                    {conteudo(coluna, linha)}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
};
