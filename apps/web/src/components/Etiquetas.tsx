import { corCombustivel } from "../lib/cores.ts";

export const EtiquetaCombustivel = ({ nome }: { nome: string }) => {
  const cor = corCombustivel(nome);
  return (
    <span
      className="etiqueta"
      style={{
        backgroundColor: `${cor}1a`,
        border: `1px solid ${cor}55`,
        color: cor,
      }}
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: cor }}
      />
      {nome}
    </span>
  );
};

export const EtiquetaTipo = ({ tipo }: { tipo: string }) => {
  const menor = tipo === "MENOR";
  return (
    <span
      className="etiqueta"
      style={
        menor
          ? {
              backgroundColor: "#dcfce7",
              border: "1px solid #16a34a55",
              color: "#15803d",
            }
          : {
              backgroundColor: "#fee2e2",
              border: "1px solid #dc262655",
              color: "#b91c1c",
            }
      }
    >
      {menor ? "Menor preço" : "Maior preço"}
    </span>
  );
};
