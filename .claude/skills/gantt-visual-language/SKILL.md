---
name: gantt-visual-language
description: Linguagem visual do Gantt de programa Stellantis PHES — tokens de cor, geometria, camadas de desenho, mapeamento status→estilo, marcos (gate/xgate/today) e regras de rotulagem. Use sempre que for desenhar, revisar ou comparar um cronograma/timeline deste padrão, gerar SVG/PNG/PDF do Gantt, ou ajustar fidelidade visual contra a referência.
---

# Linguagem visual — Gantt de programa (padrão PHES)

## Anatomia (de cima para baixo)
1. Faixa de título navy, largura total, texto branco centralizado.
2. `Last update on: {mês/ano}` no canto superior esquerdo, negrito, ~6 pt.
3. Header do eixo: banda de ano + banda de mês, fundo navy, texto branco.
4. Faixa de marcos: rótulos (PM, CM, SFM, SHRM, SOPM, X0..X3) + caixa de legenda.
5. Corpo: painel esquerdo (coluna de grupo + caixas navy com nome do componente)
   e área do gráfico com faixas de mês alternadas.

## Tokens
```
NAVY #243782 · NAVY_DARK #1B2A63 · GRID #D9D9D9 · BAND_ALT #F2F2F2
TODAY #FF0000 (tracejado) · GATE #BF8F00 (tracejado) · XGATE #243782 (tracejado + triângulo)
MONTH_W 24 · ROW_H 16 · BAR_H 11 · HEADER_H 44 · LEFT_PANEL_W 180
```

## Status → estilo de barra
| status | fill | stroke | texto |
|---|---|---|---|
| ontime | #B4C7E7 | #243782 | preto |
| delayed | #F8CBCB | #C00000 | preto |
| concluded | #243782 | #1B2A63 | branco |
| concluded_delay | #632423 | #401513 | branco |
| attention | #FFE699 | #BF8F00 | preto |

A legenda "Components" no canto superior esquerdo lista exatamente esses cinco.

## Marcos vs marcadores
- **Marco (milestone)**: evento do programa. Linha vertical tracejada em toda a
  altura. `gate` = dourado; `xgate` = navy com triângulo apontando para baixo
  no topo (X0, X1, X2, X3).
- **Marcador (marker)**: evento ancorado a uma barra específica — OT Parts,
  DTOP, PPAP, Kick off, SW Full feature, SW Bug free. Triângulo pequeno logo
  acima da barra, com rótulo em ~5,5 pt.

## Rotulagem
- Dentro da barra: `Nome  NNW` (semanas) centralizado. Se não couber
  (largura de texto > largura da barra − 8 px), mover para acima da barra.
- Datas mapeiam para x proporcionalmente **por dia**, não por coluna de mês.
  Gridline no 1º de cada mês; separador reforçado no 1º de janeiro.

## Ordem de desenho (importa)
faixas → grid → header → linhas de marco → linha Today → barras → marcadores →
rótulos → painel esquerdo → título/legenda/logo.

## Erros comuns a evitar
- Calcular posição no frontend e no backend separadamente → preview ≠ export.
  Uma única engine produz um display list; ambos apenas o desenham.
- Depender só de cor para comunicar status (sempre exibir o rótulo textual na UI).
- Usar `textLength` em SVG para forçar largura — distorce a tipografia.
