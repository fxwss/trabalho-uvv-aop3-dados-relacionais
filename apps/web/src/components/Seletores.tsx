import type {
  BairroDetalhe,
  CombustivelDetalhe,
  PostoDetalhe,
} from "@precos/shared";
import { compararCombustivel } from "@precos/shared";

interface PropsCombustivel {
  combustiveis: CombustivelDetalhe[];
  valor: number | null;
  aoMudar: (id: number | null) => void;
  rotuloTodos?: string;
  incluirTodos?: boolean;
}

export const SeletorCombustivel = ({
  combustiveis,
  valor,
  aoMudar,
  rotuloTodos = "Todos os combustíveis",
  incluirTodos = true,
}: PropsCombustivel) => (
  <div>
    <label className="rotulo" htmlFor="filtro-combustivel">
      Combustível
    </label>
    <select
      className="campo"
      id="filtro-combustivel"
      onChange={(evento) =>
        aoMudar(evento.target.value ? Number(evento.target.value) : null)
      }
      value={valor ?? ""}
    >
      {incluirTodos ? <option value="">{rotuloTodos}</option> : null}
      {[...combustiveis]
        .sort((a, b) => compararCombustivel(a.nome, b.nome))
        .map((combustivel) => (
          <option key={combustivel.codigo} value={combustivel.codigo}>
            {combustivel.nome}
          </option>
        ))}
    </select>
  </div>
);

interface PropsPosto {
  postos: PostoDetalhe[];
  valor: number | null;
  aoMudar: (id: number) => void;
}

export const SeletorPosto = ({ postos, valor, aoMudar }: PropsPosto) => {
  const porBairro = new Map<string, PostoDetalhe[]>();
  for (const posto of postos) {
    const lista = porBairro.get(posto.bairro) ?? [];
    lista.push(posto);
    porBairro.set(posto.bairro, lista);
  }

  return (
    <div>
      <label className="rotulo" htmlFor="filtro-posto">
        Posto
      </label>
      <select
        className="campo"
        id="filtro-posto"
        onChange={(evento) => aoMudar(Number(evento.target.value))}
        value={valor ?? ""}
      >
        <option disabled value="">
          Selecione um posto
        </option>
        {[...porBairro.entries()]
          .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
          .map(([bairro, lista]) => (
            <optgroup key={bairro} label={bairro}>
              {lista.map((posto) => (
                <option key={posto.codigo} value={posto.codigo}>
                  {posto.nomeFantasia}
                </option>
              ))}
            </optgroup>
          ))}
      </select>
    </div>
  );
};

interface PropsBairro {
  bairros: BairroDetalhe[];
  valor: string | null;
  aoMudar: (nome: string | null) => void;
}

export const SeletorBairro = ({ bairros, valor, aoMudar }: PropsBairro) => (
  <div>
    <label className="rotulo" htmlFor="filtro-bairro">
      Bairro
    </label>
    <select
      className="campo"
      id="filtro-bairro"
      onChange={(evento) =>
        aoMudar(evento.target.value ? evento.target.value : null)
      }
      value={valor ?? ""}
    >
      <option value="">Todos os bairros</option>
      {bairros.map((bairro) => (
        <option key={bairro.codigo} value={bairro.nome}>
          {bairro.nome} ({bairro.quantidadePostos})
        </option>
      ))}
    </select>
  </div>
);
