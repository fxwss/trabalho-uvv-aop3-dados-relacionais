export const EstadoCarregando = ({ linhas = 4 }: { linhas?: number }) => (
  <div aria-live="polite" className="space-y-2 p-4" role="status">
    <span className="sr-only">Carregando dados</span>
    {Array.from({ length: linhas }).map((_, indice) => (
      <div
        className="h-9 animate-pulse rounded-lg bg-slate-100"
        key={`esqueleto-${String(indice)}`}
      />
    ))}
  </div>
);
