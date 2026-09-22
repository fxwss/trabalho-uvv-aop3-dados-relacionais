import { NavLink, Outlet } from "react-router-dom";
import { formatData } from "@precos/shared";
import { useCatalogo } from "../hooks/consultas.ts";

const LINKS = [
  { para: "/", rotulo: "Painel" },
  { para: "/consulta-1", rotulo: "Menor e maior preço" },
  { para: "/consulta-2", rotulo: "Média e amostras" },
  { para: "/consulta-3", rotulo: "Preço mais recente" },
  { para: "/consulta-4", rotulo: "Evolução" },
  { para: "/planilhas", rotulo: "Planilhas e gráficos" },
  { para: "/postos", rotulo: "Postos" },
  { para: "/metodologia", rotulo: "Metodologia" },
];

const Layout = () => {
  const { data } = useCatalogo();
  const cidade = data?.meta
    ? `${data.meta.cidade}/${data.meta.uf}`
    : "Vila Velha/ES";

  return (
    <div className="flex min-h-screen flex-col">
      <a className="pular-para-conteudo" href="#conteudo">
        Pular para o conteúdo
      </a>

      <header className="nao-imprimir border-b border-marca-800 bg-marca-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <img
              alt=""
              className="h-10 w-10"
              height="40"
              src="/favicon.svg"
              width="40"
            />
            <div>
              <p className="text-lg leading-tight font-semibold">
                Preços dos combustíveis
              </p>
              <p className="text-sm text-marca-200">
                {cidade} · dados coletados nos postos da cidade
              </p>
            </div>
          </div>

          <nav aria-label="Seções do site">
            <ul className="flex flex-wrap gap-1">
              {LINKS.map((link) => (
                <li key={link.para}>
                  <NavLink
                    className={({ isActive }) =>
                      [
                        "block rounded-lg px-3 py-2 text-sm font-medium transition",
                        isActive
                          ? "bg-marca-700 text-white"
                          : "text-marca-100 hover:bg-marca-800 hover:text-white",
                      ].join(" ")
                    }
                    end={link.para === "/"}
                    to={link.para}
                  >
                    {link.rotulo}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8" id="conteudo">
        <Outlet />
      </main>

      <footer className="nao-imprimir border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-500">
          <p className="font-medium text-slate-700">
            Trabalho de banco de dados (AOP1 a AOP3): coleta, banco relacional e
            divulgação dos preços de combustíveis.
          </p>
          <p className="mt-1">
            Integrantes: Erick Marques, Lucas Tejada Fabres e Thiago Tejada
            Fabres.
          </p>
          {data?.meta ? (
            <p className="mt-1">
              Período coletado: {formatData(data.meta.primeiraColeta)} a{" "}
              {formatData(data.meta.ultimaColeta)} · {data.meta.totalColetas}{" "}
              amostras de preço em {data.meta.totalPostos} postos de{" "}
              {data.meta.totalBairros} bairros.
            </p>
          ) : null}
        </div>
      </footer>
    </div>
  );
};

export default Layout;
