# SPEC-002 — Engine de render (display list → SVG)

**Dono:** agente `render-engineer` · **Depende de:** SPEC-001 (`LayoutModel`)

Fonte de verdade visual: `docs/assets/referencia.png` (saída do Schedule
Generator Tool v09). Toda medida abaixo foi derivada dessa imagem e deve ser
revisada lado a lado antes do freeze.

## 1. Princípio: uma engine, dois consumidores

```
LayoutModel ──► build_display_list() ──► list[Primitive] ──┬─► React <svg>  (preview)
                                                            └─► svg_writer() ─► PNG/PDF (export)
```

`Primitive` é um dataclass serializável em JSON:

```python
Rect(x, y, w, h, fill, stroke, stroke_width, rx, dash)
Line(x1, y1, x2, y2, stroke, stroke_width, dash)
Text(x, y, s, size, weight, fill, anchor, family)
Poly(points, fill, stroke)          # triângulos dos marcadores
Img(x, y, w, h, src)                # logo institucional
Group(id, children)                 # agrupamento lógico p/ hit-testing na UI
```

Regra dura: **o React nunca calcula posição.** Se o preview e o export
divergirem, é bug da engine, não da UI.

## 2. Geometria

Os valores abaixo são os **padrões**. Desde o schema 1.1, `project.layout`
sobrescreve seis deles por projeto — ver `docs/ADR-003-dimensoes.md`:

| campo em `layout` | token | padrão | faixa |
|---|---|---|---|
| `month_w` | `MONTH_W` | 24 | 10–72 |
| `row_h` | `ROW_H` | 16 | 10–40 |
| `bar_h` | `BAR_H` | 11 | 5–30 |
| `panel_w` | `PANEL_W` | 150 | 80–320 |
| `band_h` | `BAND_H` | 112 | 60–220 |
| `font_scale` | — | 1 | 0,7–2 |

Regras de resolução (`resolveTokens`):
1. Valor ausente ou não numérico → padrão.
2. Valor fora da faixa → **fixado no limite**, nunca rejeitado.
3. `BAR_H > ROW_H − 2` → reduzido para `ROW_H − 2`. Barra maior que a lane
   invadiria o componente vizinho.
4. `font_scale` é aplicado **uma vez, no fim**, multiplicando `size` de todas as
   primitivas de texto. A checagem de overflow de rótulo (§5) usa o tamanho já
   escalado, senão o rótulo decide caber antes de crescer.

Nenhum outro módulo lê `T` diretamente: o desenho usa o objeto resolvido.

| token | valor | nota |
|-------|-------|------|
| `LEFT_PANEL_W` | 180 px | coluna de nomes de componente |
| `GROUP_COL_W` | 24 px | coluna do número do grupo |
| `MONTH_W` | 24 px | largura de 1 mês no eixo |
| `TITLE_H` | 24 px | faixa navy do título, apenas sobre a área do gráfico |
| `HEADER_H` | 44 px | banda ano (22) + banda mês (22) |
| `MILESTONE_BAND_H` | 110 px | faixa entre header e primeira linha (rótulos PM/CM/X0… e legenda) |
| `ROW_H` | 16 px | altura de uma lane |
| `BAR_H` | 11 px | altura da barra, centralizada na lane |
| `BAR_RX` | 1 px | cantos |
| `MARKER_W/H` | 9 / 7 px | triângulo apontando para baixo |
| `GUTTER` | 4 px | respiro entre grupos |

**Mapeamento de data → x (proporcional por dia, não por coluna):**

```
x(d) = ORIGIN_X + (d - chart_start).days / (chart_end - chart_start).days * TOTAL_W
TOTAL_W = n_months(chart_start, chart_end) * MONTH_W
```

Gridlines verticais no 1º dia de cada mês; separador mais forte no 1º de janeiro.

## 3. Paleta (tokens em `core/render/theme.py`)

```
NAVY        #243782   ← cor institucional herdada do arquivo legado
NAVY_DARK   #1B2A63
BAR_BLUE    #B4C7E7   stroke NAVY
BAR_RED     #F8CBCB   stroke #C00000
BAR_GOLD    #FFE699   stroke #BF8F00
BAR_MAROON  #632423   stroke #401513   text #FFFFFF
GRID        #D9D9D9
BAND_ALT    #F2F2F2   ← faixa cinza alternada de mês
TODAY       #FF0000
GATE        #BF8F00   ← PM, CM, SFM, SHRM, SOPM (tracejado)
XGATE       #243782   ← X0..X3 (tracejado + triângulo)
```

Mapa status → estilo de barra. **Estes são os padrões**; desde o schema 1.3
`project.legend.statuses` sobrescreve `label`, `fill`, `stroke`, `text` e
`hidden` de cada chave, e `project.legend.title` troca o título da caixa
(ADR-005). As **chaves** do enum são fixas — o que é editável é a aparência.

| status | fill | stroke | cor do texto |
|--------|------|--------|--------------|
| `ontime` | `BAR_BLUE` | `NAVY` | `#000000` |
| `delayed` | `BAR_RED` | `#C00000` | `#000000` |
| `concluded` | `NAVY` | `NAVY_DARK` | `#FFFFFF` |
| `concluded_delay` | `BAR_MAROON` | `#401513` | `#FFFFFF` |
| `attention` | `BAR_GOLD` | `#BF8F00` | `#000000` |

Resolução (`resolveStatuses(p)`), na mesma política de `layout` (SPEC-002 §2):
1. Campo ausente → padrão.
2. Cor fora de `^#[0-9A-Fa-f]{6}$` ou rótulo vazio → **padrão, em silêncio**.
3. `hidden` omite a linha da legenda; as barras continuam sendo desenhadas.
4. Restaurar o padrão **apaga** `project.legend`, não copia os valores padrão
   para dentro dele — ver ADR-005.

Verificado na fixture com legenda personalizada: título "Situação dos
componentes" com quatro linhas em português, `attention` oculto some da caixa
mas suas barras continuam desenhadas, cor inválida (`"azul"`, `#GGGGGG`) e
rótulo em branco caem no padrão sem erro, e a caixa cresce de 118 px para
acomodar "Concluído com atraso". Round-trip pelo layout legado com rótulos em
português devolve exatamente as chaves originais.

## 4. Camadas (ordem de desenho, de baixo para cima)

1. Faixas alternadas de mês (`BAND_ALT`)
2. Gridlines mensais/anuais
3. Header (ano, mês) — fundo `NAVY`, texto branco
4. Linhas verticais de marco (`gate` dourado tracejado, `xgate` navy tracejado)
5. Linha "Today" (vermelha tracejada, sempre acima das linhas de marco)
6. Barras de atividade
7. Marcadores triangulares + rótulos
8. Rótulos de duração e nome de atividade
9. Painel esquerdo (nomes de componentes em caixa navy, coluna de grupo)
10. Chrome: título, "Last update on:", logo, legenda "Components"

## 5. Regras de rotulagem

- `label_position="inside"`: texto centralizado na barra, formato `Nome  NNW`.
  Se `text_width > bar_width - 8`, faz *fallback* automático para `above`
  e emite `W105`.
- `label_position="above"`: texto centralizado acima da barra, `size 6`.
- Rótulo do marcador: acima do triângulo, `size 5.5`, ancorado ao centro.
- Marcos: rótulo no topo da `MILESTONE_BAND`, na cor do estilo, negrito.

## 6. Medição de texto sem DOM

O core não tem acesso ao navegador. Usar tabela de larguras por caractere para
a família alvo (Arial/Liberation Sans) em `core/render/textmetrics.py`:
`width ≈ sum(char_width[c]) * size`. Precisão suficiente (±5%) para decidir
overflow. O frontend deve usar `font-family: Arial, "Liberation Sans", sans-serif`
e `textLength` **não** deve ser usado (distorce).

## 6a. Bloco de identificação (canto superior esquerdo)

Acima da logo, uma pilha de linhas curtas em 6,5 pt negrito, uma por informação
presente:

1. `Last update on: {project.last_update}`
2. `Responsible: {project.owner}` — responsável pela criação e manutenção do
   cronograma (schema 1.4)

Linha ausente é **omitida**, não desenhada vazia. A logo é reposicionada abaixo
da pilha e, se o espaço até a faixa de marcos não comportar sua altura natural,
é reduzida proporcionalmente — o bloco de identificação tem prioridade sobre o
tamanho da marca.

O rótulo é `Responsible:` em inglês para acompanhar `Last update on:`, que vem
do arquivo de referência. Misturar idiomas em duas linhas adjacentes do mesmo
bloco chamaria mais atenção que o próprio dado.

Verificado nos quatro cenários: com as duas linhas a logo desce para y=25 e
encolhe para 27 px de altura; só com atualização, y=17,5 e 32,5 px; sem
nenhuma, y=10 e altura natural; e com `band_h` no mínimo (60) a redução
proporcional mantém tudo dentro da faixa. Linha ausente não é desenhada vazia.

## 6b. Logo institucional

O canto superior esquerdo (acima da legenda, à esquerda da faixa do título) é
reservado à logo, como no arquivo de referência. A faixa navy do título começa
em `originX − 8`, não em `x = 0`, justamente para liberar esse espaço.

A logo é um **PNG RGB de 8 bits, sem canal alfa e não entrelaçado**. Essa
restrição não é estética: nesse formato exato o `IDAT` do PNG pode ser copiado
byte a byte para o PDF como XObject `/FlateDecode` com
`/DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 >>`, sem
descomprimir nem recomprimir nada. Qualquer outro formato exigiria SMask
(alfa) ou reprocessamento de pixels.

`project.logo_path` controla a exibição sem alterar o contrato:
`null` = logo padrão embutida, `"none"` = sem logo. O campo já existia no
schema, então isso **não** é bump de `schema_version`.

## 6c. O que deliberadamente NÃO é desenhado

`components[].supplier` existe no domínio desde o schema 1.2 e **não aparece no
gráfico**. O Gantt reproduz o arquivo de referência, que não tem coluna de
fornecedor; acrescentar texto ali quebraria a fidelidade que esta SPEC protege.
O fornecedor vive na Home, nas tabelas exportadas e na aba `Auditoria` do Excel
— contextos de consulta, não de apresentação. Ver ADR-004 §4.

## 7. Legenda e chrome

Caixa de legenda com até 5 amostras 10×8 px + rótulo, borda `NAVY`, posicionada
na `MILESTONE_BAND` à esquerda, como na referência. Título e rótulos vêm de
`project.legend`; `hidden` na raiz oculta a caixa inteira. A **largura é
calculada** a partir do rótulo mais longo (com o mínimo da referência), porque
rótulos personalizados podem ser bem mais longos que os nomes originais em
inglês. Título centralizado em faixa
`NAVY` de largura total. "Last update on: {project.last_update}" no canto
superior esquerdo, `size 6`, negrito.

## 8. Testes obrigatórios

1. **Snapshot do display list**: `fixture-teste.json` → lista de primitivas
   comparada a `tests/snapshots/fixture-teste.displaylist.json`.
2. **Determinismo**: duas execuções produzem output idêntico (sem `set`/hash aleatório).
3. **Invariantes geométricas**: nenhuma barra fora da área do gráfico; nenhum
   texto com `x < ORIGIN_X`; `x(chart_start) == ORIGIN_X`.
4. **Diff visual**: PNG gerado vs baseline com tolerância de pixel; falha abre
   artefato de diff para revisão humana.
