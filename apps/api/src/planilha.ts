import ExcelJS from "exceljs";
import type { Worksheet } from "exceljs";
import { formatData } from "@precos/shared";
import type { ColunaConsulta } from "@precos/shared";
import type { LinhaGenerica } from "./csv.ts";

export interface AbaPlanilha {
  nome: string;
  colunas: ColunaConsulta[];
  linhas: LinhaGenerica[];
}

export interface SecaoResumo {
  titulo: string;
  itens: [string, string][];
}

const FORMATO_EXCEL: Record<string, string | undefined> = {
  moeda: '"R$" #,##0.000',
  numero: "#,##0",
};

const valorDaCelula = (valor: unknown, formato: string): string | number => {
  if (valor === null || valor === undefined) return "";
  if (formato === "moeda" || formato === "numero") return Number(valor);
  if (formato === "data") return formatData(String(valor));
  return String(valor);
};

const escreverCabecalho = (aba: Worksheet, colunas: ColunaConsulta[]): void => {
  const linha = aba.getRow(1);

  colunas.forEach((coluna, indice) => {
    const celula = linha.getCell(indice + 1);
    celula.value = coluna.titulo;
    celula.font = { bold: true, color: { argb: "FFFFFFFF" } };
    celula.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF166534" },
    };
    celula.alignment = { vertical: "middle", horizontal: "left" };
    aba.getColumn(indice + 1).width = Math.max(16, coluna.titulo.length + 6);
  });
};

const escreverLinhas = (
  aba: Worksheet,
  colunas: ColunaConsulta[],
  linhas: LinhaGenerica[],
): void => {
  linhas.forEach((linha, indice) => {
    const alvo = aba.getRow(indice + 2);
    colunas.forEach((coluna, colunaIndice) => {
      const celula = alvo.getCell(colunaIndice + 1);
      celula.value = valorDaCelula(linha[coluna.chave], coluna.formato);
      const formato = FORMATO_EXCEL[coluna.formato];
      if (formato) celula.numFmt = formato;
    });
  });
};

/**
 * Monta a planilha de divulgacao exigida no item II.e: cada consulta em uma aba
 * e as abas `II.e.I` e `II.e.II` com os dados que alimentam os dois graficos.
 */
export const gerarPlanilha = async (
  abas: AbaPlanilha[],
  resumoSecoes: SecaoResumo[],
): Promise<ArrayBuffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AOP3 - precos de combustiveis de Vila Velha/ES";
  workbook.created = new Date();

  const resumo = workbook.addWorksheet("Resumo");
  resumo.getColumn(1).width = 34;
  resumo.getColumn(2).width = 62;
  let linhaAtual = 1;

  for (const secao of resumoSecoes) {
    const titulo = resumo.getRow(linhaAtual);
    titulo.getCell(1).value = secao.titulo;
    titulo.getCell(1).font = {
      bold: true,
      size: 12,
      color: { argb: "FF166534" },
    };
    linhaAtual += 1;

    for (const [rotulo, valor] of secao.itens) {
      const linha = resumo.getRow(linhaAtual);
      linha.getCell(1).value = rotulo;
      linha.getCell(2).value = valor;
      linhaAtual += 1;
    }

    linhaAtual += 1;
  }

  for (const aba of abas) {
    const planilha = workbook.addWorksheet(aba.nome);
    escreverCabecalho(planilha, aba.colunas);
    escreverLinhas(planilha, aba.colunas, aba.linhas);
    planilha.views = [{ state: "frozen", ySplit: 1 }];
  }

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
};
