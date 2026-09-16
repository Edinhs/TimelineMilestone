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

Todo elemento pode declarar `hidden: true`. Nesse estado ele continua no
documento para preservar autoria, mas não aparece no palco nem no PPTX. O OPR
usa essa propriedade para alternar Scope/Risk sem apagar o texto (ADR-015).

`chart` é o único elemento **derivado**: guarda posição e tamanho, nunca a
imagem. Assim o cronograma no slide acompanha o projeto sem precisar de
sincronização (ADR-006 §2), e o `.tlsproj` não engorda com uma cópia do PNG.

## 3. Tema

`accent` (padrão `#243782`), `bg` (`#FFFFFF`), `fg` (`#131821`), `font`
(`Segoe UI`). Valor ausente ou inválido cai no padrão em silêncio. Restaurar o
padrão **apaga** `deck.theme`, não o copia — mesma regra de ADR-005.

## 4. Layouts pré-configurados

### 4.1 `cover` — capa institucional travada

A primeira página segue o padrão Stellantis de tela inteira e **não é livre**.
Geometria, marcas e composição são fixas; o usuário edita os textos, troca a
imagem de fundo e pode restaurar o fundo corporativo.

Medidas retiradas do template de referência (palco 960 × 540):

| parte | `role` | posição | observação |
|---|---|---|---|
| imagem de fundo | `cover-photo` | 0, 0, 960 × 540 | JPEG 16:9 embutido, substituível e restaurável |
| logo principal | `cover-logo` | 337, 54, 286 × 60 | versão branca transparente |
| título | `cover-title` | 62, 346, 850 × 70 | 42 pt, negrito, branco |
| subtítulo | `cover-sub` | 62, 414, 650 × 32 | 18 pt, branco, opcional |
| terceira linha | `cover-line3` | 62, 448, 650 × 28 | 14 pt, branco, opcional |
| autor | `cover-author` | 62, 494, 560 × 22 | 11 pt, branco, opcional |
| logo de rodapé | `cover-logo-small` | 757, 477, 155 × 33 | versão branca transparente |

Todos os elementos da capa têm `locked: true`. A interface bloqueia arrastar,
redimensionar, reordenar e remover; o inspetor mostra apenas o campo de texto
(e, na foto, o botão de troca). Uma capa não é lugar para improviso: o valor do
template é justamente ninguém poder movê-lo.

O **logo branco transparente é pré-processado** a partir do PNG institucional e
embutido como `data URI`. Os dois elementos reutilizam a mesma imagem, evitando
dependência do tempo de carregamento de um canvas no navegador.

**Verificado contra a referência:** fundo azul em tela inteira, logo branco
centralizado no topo, título grande na área segura inferior esquerda e assinatura
no rodapé direito. Reaplicar o layout com o título deslocado e o corpo em 99 pt
devolve x=62 e 42 pt **sem apagar o texto digitado nem o fundo escolhido**.

O fundo padrão foi reconstruído sem textos nem logos e salvo em 1920 × 1080 como
JPEG otimizado. O arquivo é embutido no HTML; por isso a capa já nasce completa
offline, sem carregamento externo.

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

O primeiro slide é sempre uma `cover`. Um clique monta exatamente dois slides:
capa corporativa e cronograma do programa. **Substitui** o deck inteiro, e o
botão avisa disso antes. Resumo executivo, marcos, fornecedores e riscos/próximos
passos não são mais criados automaticamente (ADR-014).

O projeto demonstrativo abre com esse deck já montado e o comando **Carregar
exemplo** cria outra cópia pronta, sem marcar um workspace previamente limpo
como alterado. Nomes de programa, responsável e fornecedores são anônimos.

## 6. Edição

Elementos com `locked` não respondem a arrastar, redimensionar, `Delete` nem
`Ctrl+D`; o inspetor deles expõe só o conteúdo.

- Selecionar: clique no elemento. Contorno de seleção com alça no canto
  inferior direito.
- Mover: arrastar. Redimensionar: arrastar a alça.
- Teclado com elemento selecionado: setas movem 1 px, `Shift`+setas movem 10 px,
  `Delete` remove, `Ctrl+D` duplica, `Ctrl+C` copia, `Ctrl+X` recorta e `Ctrl+V`
  cola. Esses atalhos não interceptam `INPUT`, `TEXTAREA` nem `SELECT`.
- Grade de 8 px com encaixe, desligável.
- Inspetor no painel esquerdo: posição, tamanho, ordem
  (frente/avançar/recuar/fundo) e os
  campos do tipo do elemento.
- Organizar: alinhar esquerda, centro, direita, topo, meio ou base contra o
  palco 960 × 540. Elementos `locked` não aceitam alinhamento, camada,
  clipboard, remoção ou duplicação.
- Slides: adicionar, duplicar, remover, mover para cima/baixo, definir layout,
  título, fundo e notas do apresentador.
- Texto: selecionar uma caixa abre um pop-up contextual próximo ao elemento,
  limitado à janela, com fonte, tamanho (6–96 pt), cor, negrito, itálico,
  sublinhado, alinhamento à esquerda/centro/direita, restauração e fechamento.
  As propriedades `font`, `italic` e `underline` são opcionais no contrato 1.11;
  formato, alinhamento e cor são preservados no projeto e na exportação PPTX.

Nesta wave a seleção permanece **única**. Alinhamento à caixa da seleção e
distribuição horizontal/vertical dependem de seleção múltipla e ficam para uma
wave posterior, junto com arraste e inspeção em lote.

## 6.1 Modelos externos `.tlstpl`

Um modelo é um arquivo JSON UTF-8 escolhido explicitamente pelo usuário. Não é
persistido em `localStorage`, `sessionStorage`, IndexedDB nem no workspace fora
de `project.deck`.

```json
{
  "template_version": "1.0",
  "kind": "timeline-studio-deck-template",
  "name": "Revisão de marco",
  "description": "Deck executivo 16:9",
  "created_at": "2026-08-26T12:00:00.000Z",
  "deck": { "theme": {}, "slides": [] }
}
```

Ao salvar, somente o deck é clonado e propriedades transitórias iniciadas por
`_` são removidas. Ao aplicar, o app valida envelope, limites, tipos, campos,
geometria e imagens; imagens não vazias aceitam apenas data URI PNG/JPEG. Todos
os IDs de slides e elementos são recriados, apenas `project.deck` é substituído
após confirmação, `buildCover()` é reaplicado a toda capa e o documento é
marcado como alterado. Elementos `chart` continuam apontando para o cronograma
do projeto que recebeu o modelo.

## 7. Export PPTX

Zip OOXML montado por código próprio (ADR-006 §3). Partes:

```
[Content_Types].xml · _rels/.rels
ppt/presentation.xml (+rels) · ppt/theme/theme1.xml
ppt/slideMasters/slideMaster1.xml (+rels)
ppt/slideLayouts/slideLayout1.xml (+rels)
ppt/slides/slideN.xml (+rels) · ppt/media/imageN.png|jpeg
```

Texto vira `p:sp` com `a:bodyPr`/`a:p`/`a:r`; quebra de linha vira parágrafo
próprio. Imagem vira `p:pic` com `r:embed`. Tabela vira `p:graphicFrame` com
`a:tbl`, primeira linha em `accent` com texto branco quando `header`.
O tipo da mídia é inferido pela assinatura dos bytes, não pelo nome declarado.
O relacionamento é calculado localmente durante a exportação e nunca grava
propriedade transitória no elemento do deck.

## 8. Testes obrigatórios

1. `.pptx` gerado abre em `python-pptx` sem erro; contagem de slides e de
   shapes por slide confere com o modelo.
2. Texto extraído contém os títulos dos slides.
3. Imagem embutida aparece como shape do tipo picture e a mídia existe no zip.
4. Tabela tem o número certo de linhas e colunas.
5. Posições em EMU conferem com `px × 12700` para uma amostra de elementos.
6. Deck vazio exporta um `.pptx` válido de um slide, sem quebrar.
7. Modelo exportado e reaplicado remapeia IDs, restaura as travas da capa e
  preserva todos os dados fora de `project.deck`.
8. Envelope, estrutura ou imagem inválida é rejeitado antes da substituição.
9. Reordenação, alinhamento, camadas, clipboard e proteção de campos/`locked`
   são exercitados no harness de UI.
10. Capa padrão contém fundo JPEG embutido, duas logos e título personalizável;
    o deck automático não contém os quatro slides removidos.

**Resultado da bateria.** `python-pptx` abre os arquivos gerados sem erro.
Slide de 12192000 × 6858000 EMU. Deck manual de teste: 3 slides com
`AUTO_SHAPE`/`TEXT_BOX`, `TEXT_BOX`+`PICTURE` e `TEXT_BOX`+`TABLE`; a imagem
sai em 609600/1219200/10972800/2921000 EMU, exatamente `48/96/864/230 × 12700`.
Tabela com 3×4 e conteúdo correto nas células. Mídia presente em
`ppt/media/image1.png`. Deck ausente gera um `.pptx` de um slide com o nome do
programa. "Gerar do projeto" produz 2 slides — capa e cronograma — e o pacote
PPTX não contém um terceiro slide. A capa inclui o fundo corporativo e duas
imagens de logo como elementos separados, em 12192000 × 6858000 EMU.
