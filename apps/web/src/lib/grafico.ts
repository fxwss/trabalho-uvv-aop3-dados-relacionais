/**
 * Converte o SVG do grafico em PNG para o usuario publicar em rede social ou
 * imprimir no mural, atendendo as opcoes b e c da divulgacao.
 */
export const baixarGraficoPng = async (
  container: HTMLElement | null,
  nomeArquivo: string,
): Promise<void> => {
  const svg = container?.querySelector("svg");
  if (!svg) return;

  const largura = svg.clientWidth || 900;
  const altura = svg.clientHeight || 420;

  const copia = svg.cloneNode(true) as SVGElement;
  copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copia.setAttribute("width", String(largura));
  copia.setAttribute("height", String(altura));

  const serializado = new XMLSerializer().serializeToString(copia);
  const urlDaImagem = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializado)}`;

  const imagem = new Image();
  imagem.src = urlDaImagem;

  await new Promise<void>((resolver) => {
    imagem.onload = () => resolver();
    imagem.onerror = () => resolver();
  });

  const fator = 2;
  const canvas = document.createElement("canvas");
  canvas.width = largura * fator;
  canvas.height = altura * fator;

  const contexto = canvas.getContext("2d");
  if (!contexto) return;

  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, canvas.width, canvas.height);
  contexto.scale(fator, fator);
  contexto.drawImage(imagem, 0, 0, largura, altura);

  const link = document.createElement("a");
  link.download = `${nomeArquivo}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
};
