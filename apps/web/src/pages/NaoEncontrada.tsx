import { Link } from "react-router-dom";

const NaoEncontrada = () => (
  <section className="cartao mx-auto max-w-xl p-8 text-center">
    <p className="text-xs font-semibold tracking-wide text-marca-700 uppercase">
      Erro 404
    </p>
    <h1 className="mt-2 text-2xl font-semibold">Página não encontrada</h1>
    <p className="mt-2 text-sm text-slate-600">
      O endereço acessado não existe neste site. Volte ao painel para consultar
      os preços dos combustíveis.
    </p>
    <Link className="botao-primario mt-4 inline-flex" to="/">
      Ir para o painel
    </Link>
  </section>
);

export default NaoEncontrada;
