import { create } from "zustand";

interface FiltrosState {
  combustivelId: number | null;
  bairro: string | null;
  definirCombustivel: (id: number | null) => void;
  definirBairro: (nome: string | null) => void;
  limparFiltros: () => void;
}

/**
 * Filtros compartilhados entre as telas de consulta e de planilhas, para o
 * usuario escolher o combustivel uma vez e navegar sem repetir a selecao.
 */
export const useFiltros = create<FiltrosState>()((set) => ({
  combustivelId: null,
  bairro: null,
  definirCombustivel: (id) => set({ combustivelId: id }),
  definirBairro: (nome) => set({ bairro: nome }),
  limparFiltros: () => set({ combustivelId: null, bairro: null }),
}));
