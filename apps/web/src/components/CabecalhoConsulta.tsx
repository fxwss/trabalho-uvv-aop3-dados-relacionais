import type { ReactNode } from "react";
import type { ConsultaId } from "@precos/shared";
import type { ParametrosConsulta } from "../lib/api.ts";
import { BotoesExportar } from "./BotoesExportar.tsx";
import { PainelSql } from "./PainelSql.tsx";

interface Props {
  requisito: string;
  titulo: string;
  descricao: string;
  sql?: string;
  idConsulta?: ConsultaId;
  parametros?: ParametrosConsulta;
  total?: number;
  children?: ReactNode;
}

export const CabecalhoConsulta = ({
  requisito,
  titulo,
  descricao,
  sql,
  idConsulta,
  parametros,
  total,
  children,
}: Props) => (
  <section className="mb-6">
    <p className="text-xs font-semibold tracking-wide text-marca-700 uppercase">
      Requisito {requisito}
    </p>
    <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{descricao}</p>
      </div>
      <div className="nao-imprimir flex flex-col items-end gap-2">
        {idConsulta ? (
          <BotoesExportar id={idConsulta} parametros={parametros} />
        ) : null}
        {total !== undefined ? (
          <p className="text-xs text-slate-500">
            {total} registro(s) retornado(s)
          </p>
        ) : null}
      </div>
    </div>

    {children ? (
      <div className="nao-imprimir mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    ) : null}

    {sql ? (
      <div className="nao-imprimir mt-4 overflow-hidden rounded-xl border border-slate-200">
        <PainelSql requisito={requisito} sql={sql} />
      </div>
    ) : null}
  </section>
);
