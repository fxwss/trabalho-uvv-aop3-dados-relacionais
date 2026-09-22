#!/usr/bin/env python3
"""Gera o PDF de apresentação da AOP3 (preços de combustíveis em Vila Velha/ES).

O PDF é montado em matplotlib, na mesma linha do script do diagrama ER da AOP1, sem
depender de navegador headless ou LaTeX. Os dados vêm da coleta em CSV, o SQL vem de
`packages/shared/src/sql.ts` (o mesmo texto que a API executa) e as telas são capturas
reais do site em execução.

As caixas de texto e de SQL calculam altura e quebra de linha a partir da medida real
da fonte no matplotlib, então nenhum conteúdo sai da área reservada.

Uso:
    python3 apresentacao/gerar_apresentacao.py     # requer matplotlib e pillow

Saída:
    apresentacao/AOP3-apresentacao-precos-combustiveis.pdf
"""
from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.backends.backend_pdf import PdfPages  # noqa: E402
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / "apresentacao"
IMG = PASTA / "img"
CSV_COLETA = RAIZ / "dados" / "coletas_validas_AOP2.csv"
ARQUIVO_SQL = RAIZ / "packages" / "shared" / "src" / "sql.ts"
DIAGRAMA_ER = RAIZ.parent / "aop1" / "diagrama-er.png"
SAIDA = PASTA / "AOP3-apresentacao-precos-combustiveis.pdf"

LARGURA, ALTURA = 13.333, 7.5
VERDE = "#065f46"
CINZA = "#334155"
CINZA_CLARO = "#64748b"
FUNDO_CARTAO = "#f1f5f9"
AZUL = "#1d4ed8"
LARANJA = "#b45309"
TOPO_CONTEUDO = 0.80

COLUNAS_PRECO = {
    "gasolina": "Gasolina",
    "gasolina_aditivada": "Gasolina aditivada",
    "etanol": "Etanol",
    "diesel_comum": "Diesel comum",
    "diesel_s10": "Diesel S10",
}

INTEGRANTES = [
    ("Erick Marques", "202634166"),
    ("Lucas Tejada Fabres", "202634526"),
    ("Thiago Tejada Fabres", "202632854"),
]


# --------------------------------------------------------------------------- #
# Leitura dos dados
# --------------------------------------------------------------------------- #
def ler_coletas() -> list[dict]:
    """Lê o CSV da coleta e devolve uma linha por amostra de preço."""
    with CSV_COLETA.open(encoding="utf-8") as arquivo:
        leitor = csv.DictReader(arquivo, delimiter=";")
        amostras = []
        for linha in leitor:
            for coluna, combustivel in COLUNAS_PRECO.items():
                bruto = (linha.get(coluna) or "").strip()
                if not bruto:
                    continue
                amostras.append(
                    {
                        "posto": linha["posto"],
                        "cnpj": linha["cnpj"],
                        "bairro": linha["bairro"],
                        "data": linha["data"],
                        "combustivel": combustivel,
                        "preco": float(bruto.replace(",", ".")),
                    }
                )
    return amostras


def ler_sql(constante: str) -> str:
    """Extrai o texto de uma constante SQL do pacote compartilhado."""
    texto = ARQUIVO_SQL.read_text(encoding="utf-8")
    marcador = f"export const {constante} = `"
    inicio = texto.index(marcador) + len(marcador)
    fim = texto.index("`", inicio)
    return texto[inicio:fim]


def resumir(amostras: list[dict]) -> dict:
    """Calcula os números usados nos slides."""
    postos: dict[str, dict] = {}
    for amostra in amostras:
        posto = postos.setdefault(
            amostra["posto"],
            {"posto": amostra["posto"], "bairro": amostra["bairro"], "datas": set(), "amostras": 0},
        )
        posto["datas"].add(amostra["data"])
        posto["amostras"] += 1

    por_combustivel = {}
    for combustivel in COLUNAS_PRECO.values():
        precos = [a["preco"] for a in amostras if a["combustivel"] == combustivel]
        if precos:
            por_combustivel[combustivel] = {
                "amostras": len(precos),
                "media": sum(precos) / len(precos),
                "menor": min(precos),
                "maior": max(precos),
            }

    datas = sorted({a["data"] for a in amostras})
    return {
        "postos": sorted(postos.values(), key=lambda item: item["posto"]),
        "bairros": sorted({a["bairro"] for a in amostras}),
        "por_combustivel": por_combustivel,
        "total_amostras": len(amostras),
        "primeira_data": datas[0],
        "ultima_data": datas[-1],
        "total_datas": len(datas),
    }


# --------------------------------------------------------------------------- #
# Medida de texto e utilidades de desenho
# --------------------------------------------------------------------------- #
# Largura média de um caractere, em múltiplos do tamanho da fonte, calibrada na
# renderização real dos slides (mono e proporcional caem perto do mesmo valor).
FATOR_LARGURA = 0.85


def largura_caractere(fig, tamanho: float, mono: bool = False) -> float:
    """Largura média de um caractere, em pixels, para a fonte e o tamanho pedidos.

    `mono` fica na assinatura porque o fator calibrado serve para as duas fontes.
    """
    return tamanho * FATOR_LARGURA * fig.dpi / 72


def quebrar(texto: str, maximo: int) -> list[str]:
    """Quebra linhas longas preservando a indentação, para caber na caixa."""
    linhas: list[str] = []
    for linha in texto.split("\n"):
        if len(linha) <= maximo:
            linhas.append(linha)
            continue

        recuo = len(linha) - len(linha.lstrip())
        atual = ""
        for palavra in linha.split():
            if not atual:
                atual = " " * recuo + palavra
                continue
            if len(atual) + 1 + len(palavra) <= maximo:
                atual = f"{atual} {palavra}"
                continue
            linhas.append(atual)
            atual = " " * (recuo + 2) + palavra
        linhas.append(atual)
    return linhas


def data_brasileira(iso: str) -> str:
    ano, mes, dia = iso.split("-")
    return f"{dia}/{mes}/{ano}"


def preco(valor: float) -> str:
    return f"R$ {valor:.3f}".replace(".", ",")


def novo_slide(numero: int, total: int, titulo: str, subtitulo: str | None = None):
    fig = plt.figure(figsize=(LARGURA, ALTURA))
    fig.patch.set_facecolor("white")

    faixa = fig.add_axes([0, 0.9, 1, 0.1])
    faixa.set_facecolor(VERDE)
    faixa.set_xticks([])
    faixa.set_yticks([])
    for borda in faixa.spines.values():
        borda.set_visible(False)

    faixa.text(0.035, 0.62, titulo, color="white", fontsize=20, fontweight="bold", va="center")
    faixa.text(
        0.035,
        0.24,
        "AOP3: divulgação dos preços de combustíveis em Vila Velha/ES",
        color="#a7f3d0",
        fontsize=10,
        va="center",
    )
    faixa.text(0.965, 0.5, f"{numero}/{total}", color="white", fontsize=12, va="center", ha="right")

    if subtitulo:
        fig.text(0.035, 0.855, subtitulo, color=CINZA, fontsize=12, va="top")
    return fig


def cartao(fig, x, y, largura, altura, cor=FUNDO_CARTAO, borda="#cbd5e1"):
    eixo = fig.add_axes([x, y, largura, altura])
    eixo.set_xticks([])
    eixo.set_yticks([])
    eixo.set_facecolor(cor)
    for nome, valor in eixo.spines.items():
        valor.set_color(borda)
        valor.set_visible(nome != "top")
    return eixo


def texto_caixa(
    fig,
    x,
    topo,
    largura,
    titulo,
    linhas,
    cor_titulo=VERDE,
    tamanho=10.5,
    altura_minima=0.0,
) -> float:
    """Desenha um cartão com título e texto, com altura calculada pelo conteúdo."""
    por_caractere = largura_caractere(fig, tamanho)
    disponivel = (largura - 0.045) * fig.get_figwidth() * fig.dpi
    maximo = max(18, int(disponivel / por_caractere))

    corpo: list[str] = []
    for linha in linhas:
        corpo.extend(quebrar(linha, maximo) if linha.strip() else [""])

    altura_linha = tamanho * 1.5 / 72 / ALTURA
    altura = max(altura_minima, 0.075 + len(corpo) * altura_linha + 0.025)

    cartao(fig, x, topo - altura, largura, altura)
    fig.text(x + 0.022, topo - 0.032, titulo, fontsize=12.5, fontweight="bold", color=cor_titulo, va="top")
    fig.text(
        x + 0.022,
        topo - 0.078,
        "\n".join(corpo),
        fontsize=tamanho,
        color=CINZA,
        va="top",
        linespacing=1.5,
    )
    return altura


def caixa_sql(fig, x, topo, largura, titulo, sql: str, tamanho=6.6, comentario=False) -> float:
    """Desenha o bloco escuro com o SQL, quebrando as linhas que não couberem."""
    por_caractere = largura_caractere(fig, tamanho, mono=True)
    disponivel = (largura - 0.04) * fig.get_figwidth() * fig.dpi
    maximo = max(30, int(disponivel / por_caractere))

    linhas = quebrar(sql.strip(), maximo)
    altura_linha = tamanho * 1.4 / 72 / ALTURA
    altura = 0.08 + len(linhas) * altura_linha

    cartao(fig, x, topo - altura, largura, altura, cor="#0f172a", borda="#0f172a")
    fig.text(x + 0.018, topo - 0.028, titulo, fontsize=10, fontweight="bold", color="#6ee7b7", va="top")
    fig.text(
        x + 0.018,
        topo - 0.062,
        "\n".join(linhas),
        fontsize=tamanho,
        color="#e2e8f0" if comentario else "#f8fafc",
        va="top",
        family="monospace",
        linespacing=1.4,
    )
    return altura


def tabela(fig, x, y, largura, altura, colunas, linhas, tamanho=9.5, larguras=None):
    eixo = fig.add_axes([x, y, largura, altura])
    eixo.axis("off")
    objeto = eixo.table(
        cellText=linhas,
        colLabels=colunas,
        loc="upper center",
        cellLoc="left",
        colLoc="left",
        colWidths=larguras,
        bbox=[0, 0, 1, 1],
    )
    objeto.auto_set_font_size(False)
    objeto.set_fontsize(tamanho)
    for (indice_linha, _), celula in objeto.get_celld().items():
        celula.set_edgecolor("#e2e8f0")
        celula.PAD = 0.03
        if indice_linha == 0:
            celula.set_facecolor(VERDE)
            celula.set_text_props(color="white", fontweight="bold")
    return objeto


def imagem_proporcional(fig, caminho: Path, x, y, largura, altura):
    """Encaixa a imagem na área reservada mantendo a proporção original.

    `largura` e `altura` são frações da figura, então a comparação precisa ser
    feita em polegadas antes de decidir se a imagem é limitada por largura ou
    por altura.
    """
    if not caminho.exists():
        return
    dados = plt.imread(caminho)
    proporcao = dados.shape[1] / dados.shape[0]

    largura_inicial_in = largura * fig.get_figwidth()
    altura_inicial_in = largura_inicial_in / proporcao
    limite_in = altura * fig.get_figheight()

    if altura_inicial_in <= limite_in:
        largura_frac = largura
        altura_frac = altura_inicial_in / fig.get_figheight()
    else:
        altura_frac = altura
        largura_frac = (limite_in * proporcao) / fig.get_figwidth()

    eixo = fig.add_axes(
        [
            x + (largura - largura_frac) / 2,
            y + (altura - altura_frac) / 2,
            largura_frac,
            altura_frac,
        ]
    )
    eixo.imshow(dados, aspect="auto")
    eixo.set_xticks([])
    eixo.set_yticks([])
    for valor in eixo.spines.values():
        valor.set_color("#cbd5e1")


def bloco_fluxo(fig, x, y, largura, altura, titulo, detalhe, cor):
    eixo = fig.add_axes([x, y, largura, altura])
    eixo.set_xticks([])
    eixo.set_yticks([])
    eixo.axis("off")
    eixo.add_patch(
        FancyBboxPatch(
            (0.02, 0.05),
            0.96,
            0.9,
            boxstyle="round,pad=0.02,rounding_size=0.08",
            linewidth=1.4,
            edgecolor=cor,
            facecolor="white",
            transform=eixo.transAxes,
        )
    )
    eixo.text(0.5, 0.62, titulo, ha="center", va="center", fontsize=11.5, fontweight="bold", color=cor)
    eixo.text(0.5, 0.28, detalhe, ha="center", va="center", fontsize=9.5, color=CINZA)


def seta(fig, x1, x2, y):
    eixo = fig.add_axes([0, 0, 1, 1])
    eixo.axis("off")
    eixo.add_patch(
        FancyArrowPatch(
            (x1, y),
            (x2, y),
            transform=eixo.transAxes,
            arrowstyle="-|>",
            mutation_scale=16,
            color=CINZA_CLARO,
            linewidth=1.4,
        )
    )


def legenda_imagem(fig, x, topo, texto):
    fig.text(x, topo, texto, fontsize=11, fontweight="bold", color=VERDE, va="top")


# --------------------------------------------------------------------------- #
# Slides
# --------------------------------------------------------------------------- #
def slide_capa(numero, total, dados):
    fig = plt.figure(figsize=(LARGURA, ALTURA))
    fig.patch.set_facecolor(VERDE)

    fig.text(0.08, 0.83, "PREÇOS DOS COMBUSTÍVEIS EM VILA VELHA/ES", color="white", fontsize=28, fontweight="bold")
    fig.text(
        0.08,
        0.755,
        "Coleta, banco de dados relacional e divulgação para a comunidade",
        color="#a7f3d0",
        fontsize=15,
    )

    fig.text(0.08, 0.63, "AOP3: apresentação da entrega", color="white", fontsize=14, fontweight="bold")
    fig.text(
        0.08,
        0.575,
        "Opção (a): website que responde às quatro consultas do item II.d,",
        color="#d1fae5",
        fontsize=12,
    )
    fig.text(
        0.08,
        0.53,
        "com as planilhas e os gráficos do item II.e e apoio às opções (b) e (c)",
        color="#d1fae5",
        fontsize=12,
    )

    fig.text(0.08, 0.41, "Integrantes", color="white", fontsize=12, fontweight="bold")
    for indice, (nome, matricula) in enumerate(INTEGRANTES):
        fig.text(0.08, 0.36 - indice * 0.045, f"{nome}: matrícula {matricula}", color="#ecfdf5", fontsize=11.5)

    fig.text(0.08, 0.165, "Disciplina: Banco de Dados", color="#a7f3d0", fontsize=11)
    fig.text(0.08, 0.12, "Professor(a): ____________________", color="#a7f3d0", fontsize=11)
    fig.text(0.08, 0.075, "Entrega: setembro de 2026", color="#a7f3d0", fontsize=11)

    fig.text(
        0.63,
        0.21,
        f"{dados['total_amostras']}\namostras de preço",
        color="white",
        fontsize=25,
        fontweight="bold",
        ha="center",
        va="center",
        linespacing=1.3,
    )
    fig.text(
        0.63,
        0.09,
        f"{len(dados['postos'])} postos | {len(dados['bairros'])} bairros | "
        f"{len(dados['por_combustivel'])} combustíveis",
        color="#a7f3d0",
        fontsize=11,
        ha="center",
    )
    return fig


def slide_roteiro(numero, total, dados):
    fig = novo_slide(numero, total, "O que esta apresentação cobre")
    passos = [
        ("1. Problema e fases", "AOP1, AOP2 e AOP3"),
        ("2. Coleta de dados", "requisitos II.a, II.b e II.c"),
        ("3. Modelagem", "modelo ER e projeto físico em 3FN"),
        ("4. Consultas", "as quatro consultas do item II.d"),
        ("5. Divulgação", "site, planilhas e os gráficos do item II.e"),
        ("6. Resultados", "números do período e conclusões"),
    ]
    for indice, (titulo, detalhe) in enumerate(passos):
        x = 0.05 + (indice % 3) * 0.315
        topo = 0.74 - (indice // 3) * 0.33
        texto_caixa(fig, x, topo, 0.29, titulo, [detalhe], altura_minima=0.24)
    return fig


def slide_problema(numero, total, dados):
    fig = novo_slide(
        numero,
        total,
        "O problema e as três fases do trabalho",
        "Armazenar e divulgar os preços de combustíveis da região, com resultados acessíveis à comunidade",
    )

    bloco_fluxo(
        fig,
        0.05,
        0.40,
        0.26,
        0.30,
        "AOP1: projeto conceitual",
        "Modelo ER completo:\n5 entidades, 4 relacionamentos,\ncardinalidades e tipos de atributo",
        VERDE,
    )
    bloco_fluxo(
        fig,
        0.37,
        0.40,
        0.26,
        0.30,
        "AOP2: projeto lógico e físico",
        "Modelo relacional em 3FN\nimplementado em PostgreSQL 16,\ncom chaves e restrições",
        AZUL,
    )
    bloco_fluxo(
        fig,
        0.69,
        0.40,
        0.26,
        0.30,
        "AOP3: divulgação",
        "Site com as consultas,\nplanilhas e gráficos\npara a comunidade",
        LARANJA,
    )
    seta(fig, 0.315, 0.365, 0.55)
    seta(fig, 0.635, 0.685, 0.55)

    texto_caixa(
        fig,
        0.05,
        0.34,
        0.90,
        "Decisão de arquitetura da AOP3",
        [
            "O site não guarda dado novo: ele consulta o banco criado na AOP2 e apresenta o resultado.",
            "Uma API em Node.js executa o SQL do item II.d e entrega JSON; o site apenas formata e desenha.",
            "Gráficos e planilhas saem das mesmas consultas, então não existe número duplicado em lugar nenhum.",
        ],
    )
    return fig


def slide_coleta(numero, total, dados):
    fig = novo_slide(
        numero,
        total,
        "Coleta de dados: requisitos II.a, II.b e II.c",
        "Coleta própria nos postos, sempre em visitas realizadas em datas diferentes",
    )

    cartoes = [
        ("Postos cadastrados", str(len(dados["postos"])), "II.a pede no mínimo 5"),
        ("Bairros atendidos", str(len(dados["bairros"])), "II.c pede no mínimo 2"),
        (
            "Datas distintas por posto",
            str(min(len(posto["datas"]) for posto in dados["postos"])),
            "II.b pede no mínimo 5 coletas",
        ),
        ("Amostras de preço", str(dados["total_amostras"]), f"em {len(dados['por_combustivel'])} combustíveis"),
    ]
    for indice, (titulo, valor, detalhe) in enumerate(cartoes):
        x = 0.05 + indice * 0.23
        cartao(fig, x, 0.58, 0.21, 0.22)
        fig.text(x + 0.02, 0.75, titulo, fontsize=10, color=CINZA_CLARO, va="top")
        fig.text(x + 0.02, 0.675, valor, fontsize=22, fontweight="bold", color=VERDE, va="center")
        fig.text(x + 0.02, 0.625, detalhe, fontsize=9, color=CINZA_CLARO, va="top")

    fig.text(0.05, 0.525, "Postos visitados e volume coletado", fontsize=13, fontweight="bold", color=VERDE)
    tabela(
        fig,
        0.05,
        0.09,
        0.53,
        0.41,
        ["Posto", "Bairro", "Datas", "Amostras"],
        [
            (posto["posto"], posto["bairro"], str(len(posto["datas"])), str(posto["amostras"]))
            for posto in dados["postos"]
        ],
        tamanho=8,
        larguras=[0.38, 0.28, 0.15, 0.19],
    )

    texto_caixa(
        fig,
        0.61,
        0.50,
        0.34,
        "Endereço dos postos",
        [
            "O CSV da coleta não tem endereço, mas a consulta II.d.I exige esse dado.",
            "O script `npm run seed` consulta a base pública de CNPJ (BrasilAPI) e gera "
            "dados/posto_enderecos.csv, um arquivo revisável que alimenta o banco.",
            f"Período coletado: {data_brasileira(dados['primeira_data'])} a "
            f"{data_brasileira(dados['ultima_data'])}.",
        ],
        tamanho=9,
    )
    return fig


def slide_modelo(numero, total, dados):
    fig = novo_slide(
        numero,
        total,
        "Modelagem: modelo ER (AOP1) e projeto físico (AOP2)",
        "Cinco entidades, chave composta em COLETA e terceira forma normal no banco",
    )
    imagem_proporcional(fig, DIAGRAMA_ER, 0.02, 0.06, 0.47, 0.72)
    fig.text(0.02, 0.045, "Diagrama completo em aop1/diagrama-er.pdf", fontsize=8.5, color=CINZA_CLARO)

    texto_caixa(
        fig,
        0.53,
        TOPO_CONTEUDO,
        0.43,
        "Entidades e relacionamentos",
        [
            "CIDADE possui BAIRRO (1,N para 1,1)",
            "BAIRRO localiza POSTO (1,N para 1,1)",
            "POSTO realiza COLETA (1,N para 1,1)",
            "COMBUSTIVEL é coletado em COLETA (1,N para 1,1)",
            "Chave de COLETA: posto + combustível + data",
        ],
    )
    texto_caixa(
        fig,
        0.53,
        0.49,
        0.43,
        "Tabelas no PostgreSQL 16",
        [
            "cidade, bairro, posto, combustivel, coleta",
            "Chaves primárias, estrangeiras e alternativa (CNPJ único)",
            "UNIQUE (codigo_posto, codigo_combustivel, data_coleta)",
            "CHECK de preço maior que zero e data até hoje",
            "Integridade referencial em todas as relações",
        ],
        cor_titulo=AZUL,
    )
    return fig


def slide_consultas_visao(numero, total, dados):
    fig = novo_slide(
        numero,
        total,
        "As quatro consultas do item II.d",
        "Todas executadas pela API no banco físico, com o SQL visível dentro do site",
    )
    tabela(
        fig,
        0.05,
        0.44,
        0.90,
        0.34,
        ["Requisito", "Consulta", "Dados retornados", "Volume"],
        [
            (
                "II.d.I",
                "Menor e maior preço por combustível",
                "Posto, endereço, bairro, combustível, valor e data",
                "2 linhas por combustível",
            ),
            (
                "II.d.II",
                "Quantidade de amostras e preço médio",
                "Posto, bairro, combustível, média e amostras",
                "25 combinações",
            ),
            (
                "II.d.III",
                "Preço mais recente por posto e combustível",
                "Posto, bairro, combustível, valor e data",
                "25 linhas",
            ),
            (
                "II.d.IV",
                "Evolução do preço de um combustível em um posto",
                "Série ordenada pelas datas de coleta",
                "5 a 6 coletas",
            ),
        ],
        tamanho=9.5,
        larguras=[0.13, 0.33, 0.39, 0.15],
    )

    texto_caixa(
        fig,
        0.05,
        0.40,
        0.90,
        "Recursos de SQL usados",
        [
            "ROW_NUMBER() OVER (PARTITION BY ...) para isolar o menor e o maior preço, com empate resolvido pela data",
            "JOIN entre coleta, posto, bairro e combustível para trazer endereço e bairro em todas as respostas",
            "DISTINCT ON (codigo_posto, codigo_combustivel) com ORDER BY data DESC para o preço mais recente",
            "Filtros opcionais de posto e combustível, reaproveitados pelos gráficos do item II.e",
        ],
        cor_titulo=AZUL,
    )
    return fig


def slide_sql(numero, total, dados):
    fig = novo_slide(
        numero,
        total,
        "O SQL das consultas (extrato real do projeto)",
        "O mesmo texto que a API executa e que o site mostra ao usuário",
    )
    caixa_sql(fig, 0.04, TOPO_CONTEUDO, 0.44, "II.d.I: menor e maior preço", ler_sql("SQL_MIN_MAX"))
    caixa_sql(fig, 0.52, TOPO_CONTEUDO, 0.44, "II.d.III: preço mais recente", ler_sql("SQL_ULTIMO_PRECO"))
    return fig


def slide_resultado_minmax(numero, total, dados):
    fig = novo_slide(
        numero,
        total,
        "II.d.I no site: menor e maior preço por combustível",
        "Captura da página em execução, com o resultado da consulta no banco",
    )
    imagem_proporcional(fig, IMG / "consulta-1.png", 0.04, 0.30, 0.92, 0.46)
    texto_caixa(
        fig,
        0.04,
        0.26,
        0.92,
        "Leitura dos dados",
        [
            f"Gasolina variou de {preco(dados['por_combustivel']['Gasolina']['menor'])} a "
            f"{preco(dados['por_combustivel']['Gasolina']['maior'])} o litro, "
            f"diferença de "
            f"{(dados['por_combustivel']['Gasolina']['maior'] / dados['por_combustivel']['Gasolina']['menor'] - 1) * 100:.1f}%.",
            "O maior preço de gasolina aditivada e de etanol aparece no posto de Praia da Costa; "
            "o menor, no posto de Cobi de Cima.",
        ],
        tamanho=10,
    )
    return fig


def slide_resultado_recente(numero, total, dados):
    fig = novo_slide(
        numero,
        total,
        "II.d.II e II.d.III no site: médias e preço mais recente",
        "As duas consultas que respondem quanto cada posto cobra hoje e qual a média do período",
    )
    legenda_imagem(fig, 0.05, TOPO_CONTEUDO, "II.d.II: amostras e preço médio por posto")
    imagem_proporcional(fig, IMG / "consulta-2.png", 0.04, 0.06, 0.44, 0.68)

    legenda_imagem(fig, 0.53, TOPO_CONTEUDO, "II.d.III: preço mais recente por posto")
    imagem_proporcional(fig, IMG / "consulta-3.png", 0.52, 0.06, 0.44, 0.68)
    return fig


def slide_grafico_geral(numero, total, dados):
    fig = novo_slide(
        numero,
        total,
        "Item II.e.I: evolução do preço médio de cada combustível",
        "Média entre os postos monitorados, em cada data de coleta",
    )
    texto_caixa(
        fig,
        0.05,
        TOPO_CONTEUDO,
        0.90,
        "O que o gráfico mostra",
        [
            "Gasolina e gasolina aditivada ficam quase estáveis no período, com leve queda nas últimas coletas.",
            "Etanol é o combustível mais sensível: variou de R$ 4,35 a R$ 4,99, diferença de mais de 14%.",
            "Diesel S10 e diesel comum sustentam os maiores preços por litro, entre R$ 6,69 e R$ 6,99.",
        ],
        tamanho=9.5,
    )
    imagem_proporcional(fig, IMG / "planilhas-1.png", 0.05, 0.06, 0.90, 0.53)
    return fig


def slide_grafico_posto(numero, total, dados):
    fig = novo_slide(
        numero,
        total,
        "Item II.e.II: evolução do preço médio em cada posto",
        "Uma linha por posto, com filtro de combustível no próprio site",
    )
    texto_caixa(
        fig,
        0.05,
        TOPO_CONTEUDO,
        0.90,
        "O que o gráfico mostra",
        [
            "Cada linha é um posto, o que permite comparar bairros diferentes na mesma escala de preço.",
            "Os postos de Praia da Costa e Praia de Itaparica praticam os maiores preços do grupo.",
            "O posto de Cobi de Cima aparece com o menor preço de gasolina e de etanol em várias datas.",
        ],
        tamanho=9.5,
    )
    imagem_proporcional(fig, IMG / "planilhas-2.png", 0.05, 0.06, 0.90, 0.53)
    return fig


def slide_site(numero, total, dados):
    fig = novo_slide(
        numero,
        total,
        "O site da AOP3: como foi construído",
        "Aplicação React servida por nginx, com API em Node.js lendo o PostgreSQL",
    )

    bloco_fluxo(fig, 0.05, 0.58, 0.20, 0.22, "Navegador", "Site React\nresponsivo e acessível", VERDE)
    bloco_fluxo(fig, 0.28, 0.58, 0.20, 0.22, "nginx", "Arquivos estáticos\n+ proxy de /api", "#0e7490")
    bloco_fluxo(fig, 0.51, 0.58, 0.20, 0.22, "API Node.js", "Hono executa\no SQL do item II.d", AZUL)
    bloco_fluxo(fig, 0.74, 0.58, 0.20, 0.22, "PostgreSQL 16", "Banco da AOP2\ncom a carga da coleta", LARANJA)
    seta(fig, 0.252, 0.278, 0.69)
    seta(fig, 0.482, 0.508, 0.69)
    seta(fig, 0.712, 0.738, 0.69)

    imagem_proporcional(fig, IMG / "painel.png", 0.04, 0.07, 0.45, 0.45)

    altura_telas = texto_caixa(
        fig,
        0.53,
        0.52,
        0.43,
        "Telas entregues",
        [
            "Painel com os preços da coleta mais recente",
            "Quatro páginas de consulta, uma por item do II.d",
            "Página de planilhas e gráficos (item II.e)",
            "Comparador de postos e página de metodologia",
        ],
        tamanho=9.5,
    )
    texto_caixa(
        fig,
        0.53,
        0.52 - altura_telas - 0.04,
        0.43,
        "Detalhes técnicos",
        [
            "React 19, TypeScript, Vite e Recharts",
            "Tailwind CSS, TanStack Query e zustand",
            "Tabelas viram cartões no celular",
            "docker compose up -d --build sobe tudo",
        ],
        cor_titulo=AZUL,
        tamanho=9.5,
    )
    return fig


def slide_divulgacao(numero, total, dados):
    fig = novo_slide(
        numero,
        total,
        "Divulgação para a comunidade",
        "A opção (a) foi a principal, com apoio das opções (b) e (c) do enunciado",
    )
    texto_caixa(
        fig,
        0.05,
        TOPO_CONTEUDO,
        0.29,
        "(a) Website",
        [
            "Site com as quatro consultas do item II.d",
            "Aberto em qualquer celular, sem instalar nada",
        ],
        altura_minima=0.25,
    )
    texto_caixa(
        fig,
        0.355,
        TOPO_CONTEUDO,
        0.29,
        "(b) Mídias sociais",
        [
            "Botão de compartilhar no WhatsApp em todas as telas",
            "Metatags Open Graph: o link aparece com título e descrição",
        ],
        cor_titulo=AZUL,
        altura_minima=0.25,
    )
    texto_caixa(
        fig,
        0.66,
        TOPO_CONTEUDO,
        0.29,
        "(c) Locais públicos",
        [
            "Layout de impressão: Ctrl+P esconde menu e botões e mantém tabelas e gráficos",
            "Gráficos também saem em PNG para o mural da comunidade",
        ],
        cor_titulo=LARANJA,
        altura_minima=0.25,
    )

    fig.text(0.05, 0.50, "Planilhas de divulgação (item II.e)", fontsize=13, fontweight="bold", color=VERDE)
    tabela(
        fig,
        0.05,
        0.09,
        0.90,
        0.36,
        ["Arquivo", "Conteúdo", "Formato"],
        [
            ("planilha-completa-aop3.xlsx", "Todas as consultas, cadastro de postos e médias", "XLSX com abas"),
            ("menor-e-maior-preco.csv", "Consulta II.d.I", "CSV com ; e decimal com vírgula"),
            ("media-e-amostras.csv", "Consulta II.d.II", "CSV com ; e decimal com vírgula"),
            ("preco-mais-recente.csv", "Consulta II.d.III", "CSV com ; e decimal com vírgula"),
            ("evolucao-do-preco-medio.csv", "Dados do gráfico II.e.I", "CSV com ; e decimal com vírgula"),
        ],
        tamanho=9.5,
        larguras=[0.34, 0.44, 0.30],
    )
    return fig


def slide_reproducao(numero, total, dados):
    fig = novo_slide(
        numero,
        total,
        "Como reproduzir a entrega",
        "Tudo versionado no repositório: banco, carga, API, site e esta apresentação",
    )
    altura_comandos = caixa_sql(
        fig,
        0.05,
        TOPO_CONTEUDO,
        0.90,
        "Comandos",
        """
# 1. subir a stack completa (Postgres + API + site)
cp .env.example .env
npm run compose:up          # site em http://localhost:8080

# 2. desenvolvimento local
npm install
npm run banco:dev           # Postgres na porta 5433
npm run dev                 # API em 3333 e site em 5173

# 3. carga do banco (roda sozinha na primeira subida do container)
npm run seed                # gera dados/dados.sql a partir do CSV da coleta

# 4. verificação
npm run lint && npm test    # 18 testes de integração contra o banco real
""".strip(),
        8.5,
        comentario=True,
    )

    texto_caixa(
        fig,
        0.05,
        TOPO_CONTEUDO - altura_comandos - 0.03,
        0.90,
        "Verificações feitas antes da entrega",
        [
            "As quatro consultas do II.d conferidas contra agregações feitas direto no SQL, com números idênticos.",
            "Requisitos II.a, II.b e II.c validados na carga: 6 postos, 6 bairros e no mínimo 5 datas por posto.",
            "CSV e XLSX baixados e abertos no Excel em português, com separador e decimal corretos.",
            "Layout revisado no celular, sem rolagem horizontal, e na impressão, com o menu escondido.",
        ],
        cor_titulo=AZUL,
    )
    return fig


def slide_conclusao(numero, total, dados):
    fig = novo_slide(numero, total, "Conclusão", "Da modelagem ao uso real pela comunidade")
    altura_primeiro = texto_caixa(
        fig,
        0.05,
        TOPO_CONTEUDO,
        0.90,
        "O que a entrega resolve",
        [
            "O morador descobre onde o litro está mais barato hoje, quanto cada combustível custou em média e "
            "como o preço se comportou nas últimas semanas, sem precisar entender de banco de dados.",
            "",
            f"São {dados['total_amostras']} amostras de preço de {len(dados['postos'])} postos em "
            f"{len(dados['bairros'])} bairros, consultáveis no celular e",
            "prontas para impressão em mural de associação de bairro ou comércio.",
        ],
    )
    texto_caixa(
        fig,
        0.05,
        TOPO_CONTEUDO - altura_primeiro - 0.05,
        0.90,
        "Aprendizados do grupo",
        [
            "Modelar em ER antes de escrever SQL evitou retrabalho na hora de chegar à terceira forma normal.",
            "Concentrar o SQL em um único lugar do código impediu que site e planilha mostrassem números diferentes.",
            "Divulgar exige tanto tecnologia quanto cuidado de linguagem: cada número exibido tem explicação.",
        ],
        cor_titulo=AZUL,
    )
    return fig


def slide_encerramento(numero, total, dados):
    fig = plt.figure(figsize=(LARGURA, ALTURA))
    fig.patch.set_facecolor(VERDE)
    fig.text(0.5, 0.68, "Obrigado!", color="white", fontsize=42, fontweight="bold", ha="center")
    fig.text(
        0.5,
        0.57,
        "Perguntas e sugestões sobre a divulgação são bem-vindas",
        color="#a7f3d0",
        fontsize=15,
        ha="center",
    )
    fig.text(
        0.5,
        0.44,
        "Site no ar durante a apresentação em http://localhost:8080",
        color="#ecfdf5",
        fontsize=12,
        ha="center",
    )
    for indice, (nome, matricula) in enumerate(INTEGRANTES):
        fig.text(0.5, 0.32 - indice * 0.05, f"{nome}: {matricula}", color="#d1fae5", fontsize=12, ha="center")
    fig.text(0.5, 0.12, "Trabalho de Banco de Dados: AOP1 a AOP3", color="#a7f3d0", fontsize=11, ha="center")
    return fig


# --------------------------------------------------------------------------- #
# Execução
# --------------------------------------------------------------------------- #
def principal() -> None:
    dados = resumir(ler_coletas())

    slides = [
        slide_capa,
        slide_roteiro,
        slide_problema,
        slide_coleta,
        slide_modelo,
        slide_consultas_visao,
        slide_sql,
        slide_resultado_minmax,
        slide_resultado_recente,
        slide_grafico_geral,
        slide_grafico_posto,
        slide_site,
        slide_divulgacao,
        slide_reproducao,
        slide_conclusao,
        slide_encerramento,
    ]

    total = len(slides)
    with PdfPages(SAIDA) as pdf:
        for indice, construtor in enumerate(slides, start=1):
            figura = construtor(indice, total, dados)
            pdf.savefig(figura, facecolor=figura.get_facecolor())
            plt.close(figura)

    print(f"PDF gerado: {SAIDA}")
    print(f"Slides: {total}")
    print(
        f"Dados usados: {dados['total_amostras']} amostras, {len(dados['postos'])} postos, "
        f"{len(dados['bairros'])} bairros, período {dados['primeira_data']} a {dados['ultima_data']}"
    )


if __name__ == "__main__":
    principal()
