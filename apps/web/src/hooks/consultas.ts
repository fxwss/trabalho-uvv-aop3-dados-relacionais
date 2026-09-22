import { useQuery } from "@tanstack/react-query";
import type { ConsultaId } from "@precos/shared";
import {
  buscarCatalogo,
  buscarConsulta,
  type ParametrosConsulta,
} from "../lib/api.ts";

export const useCatalogo = () =>
  useQuery({
    queryKey: ["catalogo"],
    queryFn: buscarCatalogo,
    staleTime: 5 * 60 * 1000,
  });

export const useConsulta = (
  id: ConsultaId,
  parametros: ParametrosConsulta = {},
  ativo = true,
) =>
  useQuery({
    queryKey: ["consulta", id, parametros],
    queryFn: () => buscarConsulta(id, parametros),
    enabled: ativo,
  });
