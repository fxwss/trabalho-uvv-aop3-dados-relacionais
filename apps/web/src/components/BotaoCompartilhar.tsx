import { useState } from "react";

interface Props {
  texto: string;
  url?: string;
}

/** Compartilhamento rapido do resultado, com o link canonico da pagina. */
export const BotaoCompartilhar = ({ texto, url }: Props) => {
  const [copiado, definirCopiado] = useState(false);

  const endereco = url ?? window.location.href;
  const linkWhats = `https://wa.me/?text=${encodeURIComponent(`${texto} ${endereco}`)}`;

  const copiar = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(endereco);
      definirCopiado(true);
      setTimeout(() => definirCopiado(false), 2500);
    } catch {
      definirCopiado(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a className="botao" href={linkWhats} rel="noreferrer" target="_blank">
        Compartilhar no WhatsApp
      </a>
      <button className="botao" onClick={() => void copiar()} type="button">
        {copiado ? "Link copiado" : "Copiar link"}
      </button>
    </div>
  );
};
