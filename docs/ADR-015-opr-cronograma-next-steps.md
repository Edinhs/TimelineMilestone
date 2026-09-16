# ADR-015 — OPR orientada a cronograma e próximos passos

**Status:** aceito · **Data:** 2026-09-14 · **Decisor:** Ederson

## Contexto

A grade anterior dividia a metade inferior da OPR em vários cards temáticos.
A referência operacional desejada concentra a reunião em três objetos: o
cronograma, uma planilha de próximos passos e, quando necessário, Scope e
Risk/Open Points.

## Decisão

Cada OPR continua sendo um slide do próprio deck e continua existindo uma vez
por componente. A composição padrão passa a conter o cronograma compacto na
parte superior e uma tabela nativa **Next Steps** na base. O bloco **Scope /
Risk/Open Points** é opcional; quando ligado, ocupa a esquerda e reduz a tabela
para a direita.

A tabela não é rasterizada. Ela permanece `type: table`, editável no Timeline
Studio e no PowerPoint, com proporção de colunas determinada pelo papel
`opr-next-steps`.

## Conteúdo opcional sem perda

Remover os elementos ao desligar a opção apagaria texto autoral. Portanto o
contrato sobe de 1.13 para **1.14** com `element.hidden` opcional. Elementos
ocultos permanecem serializados, mas não são desenhados nem exportados.

Essa decisão também evita guardar uma segunda cópia de Scope/Risk fora do deck.
O slide continua sendo a única fonte de verdade.

## Sincronização

Na primeira criação, Next Steps recebe até seis atividades do componente,
ordenadas por data. Sincronizações posteriores preservam células editadas. A
atualização a partir do cronograma é uma ação explícita com confirmação.

Ao encontrar um OPR da grade antiga, textos autorais dos cards são consolidados
em Risk/Open Points. O bloco é ativado automaticamente para tornar a migração
visível; conteúdo vazio do template é ignorado.

## Consequências

- O slide se aproxima do formato usado na reunião de projeto.
- Próximos passos são dados editáveis, não uma imagem.
- Ocultar contexto é reversível.
- O layout usa menos da metade do teto de 40 elementos.
- Projetos 1.13 e anteriores continuam válidos; `hidden` ausente significa
  visível.
