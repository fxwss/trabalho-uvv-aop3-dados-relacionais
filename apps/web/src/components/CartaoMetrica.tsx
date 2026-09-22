import type { ReactNode } from "react";

interface Props {
  titulo: string;
  valor: string;
  descricao?: string;
  cor?: string;
  rodape?: ReactNode;
}

export const CartaoMetrica = ({
  titulo,
  valor,
  descricao,
  cor,
  rodape,
}: Props) => (
  <article className="cartao p-4">
    <header className="flex items-center gap-2">
      {cor ? (
        <span
          aria-hidden="true"
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: cor }}
        />
      ) : null}
      <h3 className="text-sm font-semibold text-slate-600">{titulo}</h3>
    </header>
    <p className="numero mt-2 text-2xl font-semibold text-slate-900">{valor}</p>
    {descricao ? (
      <p className="mt-1 text-xs text-slate-500">{descricao}</p>
    ) : null}
    {rodape ? (
      <div className="mt-2 text-xs text-slate-500">{rodape}</div>
    ) : null}
  </article>
);
