# ADR-010 — Aba OPR: o one-pager de status como slide do próprio deck

**Status:** aceito · **Data:** 2026-09-09 · **Decisor:** Ederson

## Contexto

O relatório semanal de programa termina sempre no mesmo slide: uma faixa de
título, um card largo com o cronograma e seis cards de tópico — *Sourcing*,
*Mechanical*, *Software*, *Hardware*, *EHE Validation*, *Functional
requirements* — cada um com o rótulo **Open Points and Risks** e um semáforo de
risco. É o **OPR**.

Hoje ele é feito à mão no PowerPoint. O semáforo é um PNG chapado com uma elipse
colorida por cima: mudar de amarelo para vermelho é arrastar um círculo. A linha
de marcos é digitada de novo toda semana, com as datas coloridas na unha. E o
Gantt entra como imagem colada, que envelhece no instante seguinte.

Referência analisada: `J3U Status report_CW35.pptx`, slides 2 a 5 — quatro
fornecedores, o mesmo template.

## 1. O OPR é um layout de slide, não um modelo paralelo

A tentação era guardar `project.opr = { cards: [...] }` e compilar para um slide
quando fosse exportar. Descartada: seriam duas verdades para o mesmo desenho, e
a segunda desatualizaria em silêncio — exatamente o vício da aba `Projetos` do
arquivo legado (regra 8 do `CLAUDE.md`).

O OPR é **um slide do deck** com `layout: "opr"`. A aba OPR é um editor
estruturado sobre os elementos desse slide — nada além deles. Preview, palco da
Apresentação e exportador `.pptx` continuam sendo o mesmo caminho de desenho
(regra 2). A consequência boa cai de graça: depois de montado, cada elemento é
arrastável, redimensionável e editável como qualquer outro.

**Bump aditivo 1.8 → 1.9**, três adições:

| adição | por quê |
|---|---|
| `layout: "opr"` | novo valor no enum de layout |
| tipo de elemento `status` | o semáforo |
| `runs[]` no elemento `text` | estilo por trecho |

Depois, ao conferir o slide contra o modelo, faltava a faixa de cronograma:
**bump aditivo 1.9 → 1.10**, `chart.variant` (`"full"` · `"compact"`).
Ausente ou inválido = `"full"`, então nenhum documento anterior muda de cara.
A alternativa era desenhar compacto só quando o papel fosse `opr-chart` — sem
mexer no contrato, mas prendendo a faixa ao OPR e impedindo voltar ao completo
lá dentro. `variant` faz dela um tipo de gráfico de verdade, inserível em
qualquer slide. O desenho está em SPEC-002 §9; continua sendo o mesmo display
list e o mesmo serializador (regra 2).

## 2. O semáforo é um elemento, não cinco primitivas

Um badge composto de pílula + rótulo + caixa + três círculos custaria 5
elementos. Sete cards × 5 = 35, e o teto por slide é 40: a grade inteira não
caberia. Como elemento único, o slide fecha em **33** e ainda sobram sete vagas
para as ilustrações que o usuário cola nos cards.

O elemento guarda `label`, `level` e `slots`. Na exportação ele se expande em
`3 + slots` formas OOXML, com ids numa faixa alta para não colidir com os dos
demais elementos. Nível fora das casas cai em silêncio para a primeira, mesma
política do ADR-003 e do ADR-005.

## 3. `runs[]` espelha `a:r` do OOXML

Sem estilo por trecho não existe o card da referência: o rótulo de entrada é
sublinhado, a ênfase é negrito e os marcos vêm em verde e vermelho **dentro da
mesma linha**. As alternativas eram inventar uma marcação de texto (`*negrito*`)
ou quebrar cada trecho num elemento próprio — a primeira cria um parser e um
problema de escape, a segunda estoura o teto de elementos na primeira linha.

`runs` é o modelo que o próprio OOXML usa, então o exportador ficou **mais**
simples, não mais complexo. É opcional: ausente, o elemento continua sendo um
trecho só com os atributos antigos, e nenhum documento anterior muda de cara.

## 4. A linha de marcos é gerada, mas não se auto-atualiza

"Atualizar marcos do projeto" reescreve a primeira linha do card largo a partir
dos gates do cronograma, com uma cor por situação. É um clique explícito, como
"Gerar do projeto" (ADR-006 §2): um slide que se reescreve sozinho apaga o
ajuste manual feito às 23h antes da reunião, e a perda é silenciosa.

O editor de linhas reconhece a forma "rótulo sublinhado + texto" e mostra campos
para ela. Um parágrafo que não couber nessa forma — a linha de marcos, com uma
cor por gate — aparece como **bloco gerado**, somente leitura, e é devolvido
intacto. Decompor esse parágrafo em campos apagaria as cores.

## 5. O que trava e o que não trava

Faixa, título, logo e tarja de confidencialidade são identidade da empresa:
`locked` para geometria, mesmo argumento da capa (ADR-006 §3b); textos
personalizáveis continuam editáveis diretamente no palco. Os cards não. O OPR
aceita imagens livres pelo mesmo elemento `image` da Apresentação. Reaplicar a grade
devolve a geometria do template **sem apagar o que foi digitado**, preserva
nível de risco e ilustrações soltas, e não ressuscita um semáforo que o usuário
removeu de propósito — a referência tem cards sem badge.

## Não fazer (por ora)

- Ler um `.pptx` existente para importar um OPR já pronto (ADR-006, mesma razão).
- Ícone "i" com hyperlink para o slide de detalhe: o exportador ainda não escreve
  relacionamento de navegação entre slides.
- Sobrescrito e subscrito (`15th`, `22nd`) nos trechos. O modelo usa, mas
  `runs` não tem `baseline` e não vale um bump para cosmética.
A geração em lote deixou de ser pendência quando o requisito foi definido por
**componente**, sem compartilhar tópicos entre fornecedores. A decisão está no
ADR-013.

## Evolução da composição

O princípio deste ADR permanece: a OPR é um slide do deck. A grade de cards
descrita aqui foi substituída em 2026-09-14 pela composição cronograma + Next
Steps + Scope/Risk opcional. A decisão atual está no ADR-015 e a geometria em
SPEC-008.
