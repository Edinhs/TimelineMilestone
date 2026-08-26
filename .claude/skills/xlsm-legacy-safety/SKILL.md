---
name: xlsm-legacy-safety
description: Regras de segurança para ler ou modificar workbooks .xlsm com macros, shapes DrawingML e controles ActiveX (ex.: Schedule Generator Tool, Timing_XXX.xlsm). Use antes de qualquer operação de leitura, import, edição ou conversão desses arquivos — openpyxl e LibreOffice destroem conteúdo de forma silenciosa.
---

# Segurança ao manipular .xlsm com shapes e VBA

## Regra padrão: somente leitura

Para **importar dados** de um .xlsm legado:
1. Copiar para caminho temporário descartável.
2. `openpyxl.load_workbook(tmp, data_only=True, read_only=True)` — **sem salvar**.
3. Descartar o temporário.
4. Confirmar com `cmp -s` que o arquivo original continua byte-idêntico.

## Por que nunca salvar com openpyxl
`keep_vba=True` apaga ~99% do DrawingML — formas arbitrárias, botões, textboxes
e o Gantt inteiro desenhado pela macro. Só imagens sobrevivem. Verificado por
round-trip: `drawingN.xml` de 413.685 B caiu para 1.383 B.

## Por que nunca usar LibreOffice para re-salvar
- Editar a biblioteca VBA real do projeto e depois `store()`/`storeToURL()` com
  filtro "Calc MS Excel 2007 VBA XML" falha reprodutivelmente:
  `com.sun.star.io.IOException ... 0xc10 (Error Area:Io Class:Write Code:16)`.
- Qualquer round-trip degrada as formas em 40–60% do tamanho em bytes e
  **remove `xl/activeX/` inteiro** do zip.

## Se a edição for inevitável: cirurgia de zip/XML bruta
1. Abrir o `.xlsm` como `zipfile.ZipFile`.
2. Copiar todas as partes não relacionadas **byte a byte** (`zout.writestr(item, data)`).
3. Reescrever apenas as pequenas partes XML alvo.
4. Verificar: XML bem formado → `cmp -s` de tudo que não devia mudar →
   `recalc.py` em cópia descartável → render em PDF para spot-check visual.

### Armadilhas de XML
- `styles.xml`: arrays 0-indexados e append-safe — o índice do novo item é a
  **contagem antiga**, não contagem+1.
- Ordem exigida em `CT_Worksheet`: `sheetData` → `sheetProtection` → `mergeCells`
  → `conditionalFormatting` → `dataValidations` → `pageMargins` → `drawing`.
  Fora de ordem, o Excel real não abre mesmo que o LibreOffice tolere.

## Ao gerar um .xlsx novo
Sem restrição — arquivo novo com openpyxl é seguro. Mas grave durações como
valores estáticos, nunca fórmulas: o arquivo legado tinha fórmula
auto-referenciada em `Final Date` e `calcPr` sem `iterate="1"`.
