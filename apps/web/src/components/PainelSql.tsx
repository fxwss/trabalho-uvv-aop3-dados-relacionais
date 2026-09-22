interface Props {
  sql: string;
  requisito?: string;
}

/**
 * Mostra a consulta SQL que gerou a tabela. Serve para o professor conferir o
 * item II.d e para deixar claro de onde vem cada numero divulgado.
 */
export const PainelSql = ({ sql, requisito }: Props) => (
  <details className="border-t border-slate-200 bg-slate-50/60">
    <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-marca-800 hover:bg-slate-100">
      Ver a consulta SQL executada{requisito ? ` (${requisito})` : ""}
    </summary>
    <pre className="max-h-80 overflow-auto border-t border-slate-200 bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
      <code>{sql}</code>
    </pre>
  </details>
);
