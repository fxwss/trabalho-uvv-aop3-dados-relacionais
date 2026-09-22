import { lazy, Suspense, type ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { EstadoCarregando } from "./components/EstadoCarregando.tsx";
import Layout from "./components/Layout.tsx";

/**
 * Cada tela entra por import dinamico para o visitante baixar so o que usar.
 * As bibliotecas de grafico ficam apenas nos chunks que realmente desenham grafico.
 */
const Painel = lazy(() => import("./pages/Painel.tsx"));
const ConsultaMinMax = lazy(() => import("./pages/ConsultaMinMax.tsx"));
const ConsultaMediaAmostras = lazy(
  () => import("./pages/ConsultaMediaAmostras.tsx"),
);
const ConsultaUltimoPreco = lazy(
  () => import("./pages/ConsultaUltimoPreco.tsx"),
);
const ConsultaEvolucao = lazy(() => import("./pages/ConsultaEvolucao.tsx"));
const Planilhas = lazy(() => import("./pages/Planilhas.tsx"));
const Postos = lazy(() => import("./pages/Postos.tsx"));
const Metodologia = lazy(() => import("./pages/Metodologia.tsx"));
const NaoEncontrada = lazy(() => import("./pages/NaoEncontrada.tsx"));

const comCarregamento = (tela: ReactNode) => (
  <Suspense fallback={<EstadoCarregando linhas={6} />}>{tela}</Suspense>
);

const App = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route element={comCarregamento(<Painel />)} path="/" />
      <Route element={comCarregamento(<ConsultaMinMax />)} path="/consulta-1" />
      <Route
        element={comCarregamento(<ConsultaMediaAmostras />)}
        path="/consulta-2"
      />
      <Route
        element={comCarregamento(<ConsultaUltimoPreco />)}
        path="/consulta-3"
      />
      <Route
        element={comCarregamento(<ConsultaEvolucao />)}
        path="/consulta-4"
      />
      <Route element={comCarregamento(<Planilhas />)} path="/planilhas" />
      <Route element={comCarregamento(<Postos />)} path="/postos" />
      <Route element={comCarregamento(<Metodologia />)} path="/metodologia" />
      <Route element={comCarregamento(<NaoEncontrada />)} path="*" />
    </Route>
  </Routes>
);

export default App;
