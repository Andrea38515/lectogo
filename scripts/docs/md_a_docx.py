"""Convierte un Markdown con el subconjunto acordado (títulos, párrafos, listas simples, tablas, **negrita**, `código`)
a un .docx con python-docx.

Uso: python -I md_a_docx.py <entrada.md> <salida.docx>

Con el manual de usuario genera: portada (primer título y las líneas siguientes hasta el primer "##"),
un índice de secciones, y numeración de páginas en el pie.
Requiere python-docx (pip install python-docx).
"""
import re
import sys

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor, Cm

PATRON_INLINE = re.compile(r"(\*\*[^*]+\*\*|`[^`]+`)")


def agregar_inline(parrafo, texto, negrita_base=False):
    for trozo in PATRON_INLINE.split(texto):
        if not trozo:
            continue
        if trozo.startswith("**") and trozo.endswith("**"):
            r = parrafo.add_run(trozo[2:-2])
            r.bold = True
        elif trozo.startswith("`") and trozo.endswith("`"):
            r = parrafo.add_run(trozo[1:-1])
            r.font.name = "Consolas"
            r._element.rPr.rFonts.set(qn("w:eastAsia"), "Consolas")
            r.font.size = Pt(9.5)
            r.bold = negrita_base
        else:
            r = parrafo.add_run(trozo)
            r.bold = negrita_base


def sombrear(celda, color):
    tc_pr = celda._element.get_or_add_tcPr()
    sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear")
    sh.set(qn("w:color"), "auto")
    sh.set(qn("w:fill"), color)
    tc_pr.append(sh)


def salto_de_pagina(doc):
    from docx.enum.text import WD_BREAK
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


def numerar_paginas(seccion):
    pie = seccion.footer.paragraphs[0]
    pie.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pie.add_run("Página ")
    run = pie.add_run()
    for tipo, texto in (("begin", None), (None, "PAGE"), ("end", None)):
        if tipo:
            el = OxmlElement("w:fldChar")
            el.set(qn("w:fldCharType"), tipo)
        else:
            el = OxmlElement("w:instrText")
            el.set(qn("xml:space"), "preserve")
            el.text = texto
        run._r.append(el)
    for r in pie.runs:
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(0x66, 0x66, 0x66)


def es_fila_tabla(linea):
    return linea.strip().startswith("|") and linea.strip().endswith("|")


def celdas_de(linea):
    return [c.strip() for c in linea.strip().strip("|").split("|")]


def es_separador(linea):
    return all(re.fullmatch(r":?-{3,}:?", c.strip()) for c in celdas_de(linea) if c.strip() != "")


def convertir(entrada, salida):
    with open(entrada, encoding="utf-8") as f:
        lineas = f.read().split("\n")

    doc = Document()
    seccion = doc.sections[0]
    seccion.left_margin = seccion.right_margin = Cm(2.5)
    seccion.top_margin = seccion.bottom_margin = Cm(2.2)
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)
    for nivel, tam in ((1, 20), (2, 15), (3, 12.5)):
        est = doc.styles[f"Heading {nivel}"]
        est.font.name = "Calibri"
        est.font.size = Pt(tam)
        est.font.bold = True
        est.font.color.rgb = RGBColor(0x3B, 0x2A, 0x8F)

    numerar_paginas(seccion)
    h2 = [re.sub(r"^##\s+", "", l).strip() for l in lineas if re.match(r"^##\s+", l)]
    primer_h2 = True

    i = 0
    primera_h1 = True
    while i < len(lineas):
        linea = lineas[i].rstrip()
        if not linea.strip():
            i += 1
            continue

        m = re.match(r"^(#{1,3})\s+(.*)$", linea)
        if m:
            nivel = len(m.group(1))
            if nivel == 1 and primera_h1:
                p = doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r = p.add_run(m.group(2).strip())
                r.bold = True
                r.font.size = Pt(26)
                r.font.color.rgb = RGBColor(0x3B, 0x2A, 0x8F)
                primera_h1 = False
            else:
                if nivel == 2 and primer_h2:
                    primer_h2 = False
                    salto_de_pagina(doc)
                    p = doc.add_paragraph()
                    r = p.add_run("Contenido")
                    r.bold = True
                    r.font.size = Pt(16)
                    r.font.color.rgb = RGBColor(0x3B, 0x2A, 0x8F)
                    for titulo in h2:
                        doc.add_paragraph(titulo)
                    salto_de_pagina(doc)
                doc.add_heading(m.group(2).strip(), level=min(nivel, 3))
            i += 1
            continue

        if es_fila_tabla(linea):
            bloque = []
            while i < len(lineas) and es_fila_tabla(lineas[i]):
                bloque.append(lineas[i])
                i += 1
            filas = [celdas_de(l) for l in bloque if not es_separador(l)]
            ancho = max(len(f) for f in filas)
            tabla = doc.add_table(rows=len(filas), cols=ancho)
            tabla.style = "Table Grid"
            tabla.alignment = WD_TABLE_ALIGNMENT.CENTER
            for r_i, fila in enumerate(filas):
                for c_i in range(ancho):
                    texto = fila[c_i] if c_i < len(fila) else ""
                    celda = tabla.cell(r_i, c_i)
                    par = celda.paragraphs[0]
                    par.paragraph_format.space_after = Pt(2)
                    agregar_inline(par, texto, negrita_base=(r_i == 0))
                    for run in par.runs:
                        run.font.size = Pt(10)
                    if r_i == 0:
                        sombrear(celda, "E9E5FA")
            doc.add_paragraph()
            continue

        m = re.match(r"^[-*]\s+(.*)$", linea)
        if m:
            p = doc.add_paragraph(style="List Bullet")
            agregar_inline(p, m.group(1))
            i += 1
            continue

        m = re.match(r"^(\d+)\.\s+(.*)$", linea)
        if m:
            # Numeración escrita a mano: el estilo "List Number" de python-docx continúa la cuenta entre listas distintas.
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Cm(1.0)
            p.paragraph_format.first_line_indent = Cm(-0.7)
            p.paragraph_format.space_after = Pt(3)
            p.add_run(f"{m.group(1)}.	")
            p.paragraph_format.tab_stops.add_tab_stop(Cm(1.0))
            agregar_inline(p, m.group(2))
            i += 1
            continue

        # párrafo normal: se juntan líneas consecutivas no vacías que no sean otro bloque
        partes = [linea.strip()]
        i += 1
        while i < len(lineas) and lineas[i].strip() and not re.match(r"^(#{1,3}\s|[-*]\s|\d+\.\s|\|)", lineas[i].strip()):
            partes.append(lineas[i].strip())
            i += 1
        p = doc.add_paragraph()
        agregar_inline(p, " ".join(partes))

    doc.save(salida)
    print(f"{entrada} -> {salida}")


if __name__ == "__main__":
    convertir(sys.argv[1], sys.argv[2])
