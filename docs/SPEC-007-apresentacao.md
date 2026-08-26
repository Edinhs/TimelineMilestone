# SPEC-007 — Aba Apresentação: editor de slides e export PPTX

**Dono:** `ui-builder` (editor) + `io-integrator` (gerador PPTX)
**Depende de:** ADR-006 (decisões), SPEC-006 (dados para os slides gerados)

## 1. Palco e coordenadas

Palco fixo de **960 × 540 px** (16:9). Toda posição e tamanho de elemento é em
px nesse espaço. A exportação multiplica por **12700 EMU/px**, chegando ao
slide padrão de 12192000 × 6858000 EMU. O editor nunca vê EMU; o exportador
nunca vê pixel de tela.

O palco ocupa o painel direito (no lugar do preview do Gantt) enquanto a aba
Apresentação estiver ativa, escalado para caber. As demais abas voltam a mostrar
o cronograma.

## 2. Modelo

`project.deck = { theme, slides[] }`, conforme `contracts/project.schema.json`.

| tipo de elemento | campos próprios |
|---|---|
| `text` | `text`, `size`, `bold`, `align`, `color` |
| `image` | `src` (data URI) |
| `shape` | `shape` (`rect`/`roundRect`/`ellipse`/`line`), `fill`, `stroke` |
| `table` | `rows[][]`, `header` |
| `chart` | nenhum — é o Gantt do projeto, rasterizado na hora da exportação |

`chart` é o único elemento **derivado**: guarda posição e tamanho, nunca a
imagem. Assim o cronograma no slide acompanha o projeto sem precisar de
sincronização (ADR-006 §2), e o `.tlsproj` não engorda com uma cópia do PNG.

## 3. Tema

`accent` (padrão `#243782`), `bg` (`#FFFFFF`), `fg` (`#131821`), `font`
(`Segoe UI`). Valor ausente ou inválido cai no padrão em silêncio. Restaurar o
padrão **apaga** `deck.theme`, não o copia — mesma regra de ADR-005.

## 4. Layouts pré-configurados

### 4.1 `cover` — capa institucional travada

A primeira página segue o padrão Stellantis e **não é livre**. Geometria e cores
são fixas; o usuário edita apenas o texto e troca a imagem de fundo.

Medidas retiradas do template de referência (palco 960 × 540):

| parte | `role` | posição | observação |
|---|---|---|---|
| faixa superior | `cover-band` | 0, 0, 960 × 266 | `#03428F`, cor fixa |
| logo | `cover-logo` | 337, 50, 286 × 60 | versão branca sobre a faixa |
| título | `cover-title` | 94, 124, 720 × 50 | 32 pt, negrito, branco |
| subtítulo | `cover-sub` | 94, 174, 720 × 36 | 21 pt, branco |
| terceira linha | `cover-line3` | 94, 234, 720 × 36 | 21 pt, branco |
| imagem de fundo | `cover-photo` | 0, 266, 960 × 274 | substituível pelo usuário |
| autor | `cover-author` | 94, 484, 500 × 24 | 12 pt, branco |
| motivo de pontos | `cover-dot-N` | centro, sobre a divisa | decorativo |

Todos os elementos da capa têm `locked: true`. A interface bloqueia arrastar,
redimensionar, reordenar e remover; o inspetor mostra apenas o campo de texto
(e, na foto, o botão de troca). Uma capa não é lugar para improviso: o valor do
template é justamente ninguém poder movê-lo.

O **logo branco é derivado em tempo de execução** do PNG institucional já
embutido, por remapeamento de luminância num canvas. Embutir uma segunda cópia
do arquivo custaria ~18 KB por nada.

**Verificado contra o template:** faixa `#03428F` até y=266, logo branco
centrado em 337/50, título em 94/124 (1193800 × 1574800 EMU no `.pptx`, exatamente
`94/124 × 12700`), subtítulo, terceira linha e assinatura alinhados na mesma
margem de 94 px. Reaplicar o layout com o título deslocado e o corpo em 99 pt
devolve x=94 e 32 pt **sem apagar o texto digitado**.

**A foto padrão não vem embutida.** A capa nasce com um painel navy e o convite
para carregar a imagem oficial. Extrair a foto de uma captura de tela produziria
um fundo de baixa resolução, que num projetor aparece borrado — pior que a
ausência. Uma vez carregada, ela fica salva no projeto.

### 4.2 Demais layouts

| layout | monta |
|---|---|
| `title` | faixa de destaque, título grande, subtítulo com responsável e atualização |
| `content` | título no topo, área livre |
| `chart` | título no topo, elemento `chart` ocupando o corpo |
| `table` | título no topo, tabela ocupando o corpo |
| `blank` | nada |

Aplicar um layout **acrescenta** os elementos que faltam (identificados por
`role`); não apaga o que o usuário já posicionou. Em `cover`, reaplicar
restaura a geometria travada sem apagar os textos digitados.

## 5. Gerar do projeto

O primeiro slide é sempre uma `cover`. Um clique monta seis slides a partir do documento e da auditoria (SPEC-006):
capa, cronograma, marcos do programa, marcos individuais, fornecedores e
achados. **Substitui** o deck inteiro, e o botão avisa disso antes.

## 6. Edição

Elementos com `locked` não respondem a arrastar, redimensionar, `Delete` nem
`Ctrl+D`; o inspetor deles expõe só o conteúdo.

- Selecionar: clique no elemento. Contorno de seleção com alça no canto
  inferior direito.
- Mover: arrastar. Redimensionar: arrastar a alça.
- Teclado com elemento selecionado: setas movem 1 px, `Shift`+setas movem 10 px,
  `Delete` remove, `Ctrl+D` duplica.
- Grade de 8 px com encaixe, desligável.
- Inspetor no painel esquerdo: posição, tamanho, ordem (frente/trás) e os
  campos do tipo do elemento.
- Slides: adicionar, duplicar, remover, reordenar, definir layout e título.

## 7. Export PPTX

Zip OOXML montado por código próprio (ADR-006 §3). Partes:

```
[Content_Types].xml · _rels/.rels
ppt/presentation.xml (+rels) · ppt/theme/theme1.xml
ppt/slideMasters/slideMaster1.xml (+rels)
ppt/slideLayouts/slideLayout1.xml (+rels)
ppt/slides/slideN.xml (+rels) · ppt/media/imageN.png
```

Texto vira `p:sp` com `a:bodyPr`/`a:p`/`a:r`; quebra de linha vira parágrafo
próprio. Imagem vira `p:pic` com `r:embed`. Tabela vira `p:graphicFrame` com
`a:tbl`, primeira linha em `accent` com texto branco quando `header`.

## 8. Testes obrigatórios

1. `.pptx` gerado abre em `python-pptx` sem erro; contagem de slides e de
   shapes por slide confere com o modelo.
2. Texto extraído contém os títulos dos slides.
3. Imagem embutida aparece como shape do tipo picture e a mídia existe no zip.
4. Tabela tem o número certo de linhas e colunas.
5. Posições em EMU conferem com `px × 12700` para uma amostra de elementos.
6. Deck vazio exporta um `.pptx` válido de um slide, sem quebrar.

**Resultado da bateria.** `python-pptx` abre os arquivos gerados sem erro.
Slide de 12192000 × 6858000 EMU. Deck manual de teste: 3 slides com
`AUTO_SHAPE`/`TEXT_BOX`, `TEXT_BOX`+`PICTURE` e `TEXT_BOX`+`TABLE`; a imagem
sai em 609600/1219200/10972800/2921000 EMU, exatamente `48/96/864/230 × 12700`.
Tabela com 3×4 e conteúdo correto nas células. Mídia presente em
`ppt/media/image1.png`. Deck ausente gera um `.pptx` de um slide com o nome do
programa. "Gerar do projeto" produz 6 slides — capa, cronograma (1 imagem),
marcos do programa (tabela 10×6), marcos individuais (8×5), fornecedores (5×5)
e achados — em 175 KB.
