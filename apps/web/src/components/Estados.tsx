interface Props {
  mensagem: string;
  detalhe?: string;
  aoTentarNovamente?: () => void;
}

export const EstadoErro = ({ mensagem, detalhe, aoTentarNovamente }: Props) => (
  <div className="p-4" role="alert">
    <p className="font-semibold text-red-700">{mensagem}</p>
    {detalhe ? <p className="mt-1 text-sm text-slate-600">{detalhe}</p> : null}
    {aoTentarNovamente ? (
      <button className="botao mt-3" onClick={aoTentarNovamente} type="button">
        Tentar novamente
      </button>
    ) : null}
  </div>
);

export const EstadoVazio = ({ mensagem }: { mensagem: string }) => (
  <p className="p-6 text-center text-sm text-slate-500">{mensagem}</p>
);
