import type { ConsultaId } from "@precos/shared";
import { urlExportacao, type ParametrosConsulta } from "../lib/api.ts";

interface Props {
  id: ConsultaId;
  parametros?: ParametrosConsulta;
  compacto?: boolean;
}

/** Download da consulta em CSV (abre em qualquer planilha) e em XLSX. */
export const BotoesExportar = ({ id, parametros, compacto }: Props) => (
  <div className="flex flex-wrap items-center gap-2">
    <a
      className="botao"
      download
      href={urlExportacao("csv", id, parametros)}
      title="Baixar em CSV, separador ponto e virgula e decimal com virgula"
    >
      {compacto ? "CSV" : "Baixar CSV"}
    </a>
    <a
      className="botao"
      download
      href={urlExportacao("xlsx", id, parametros)}
      title="Baixar em planilha do Excel"
    >
      {compacto ? "XLSX" : "Baixar planilha (XLSX)"}
    </a>
  </div>
);
