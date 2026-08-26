# ADR-003 — Dimensões por projeto e o primeiro bump do contrato (1.0 → 1.1)

**Status:** aceito · **Data:** 2026-08-24 · **Decisor:** Ederson

## Contexto

As dimensões do desenho (largura do mês, altura da linha e da barra, painel de
componentes, faixa de marcos, tamanho do texto) estavam fixas em
`core/render/theme.py` / `T` — bons padrões, medidos na referência, mas iguais
para todo projeto. Um programa com 4 componentes e um com 40 têm necessidades
diferentes: o primeiro quer respiro, o segundo quer caber na folha.

O contrato `project.schema.json` estava **congelado** com
`additionalProperties: false` e `schema_version: "1.0"`. Guardar preferências de
dimensão dentro do projeto exige mexer nele — exatamente o caso que a regra 1 do
`CLAUDE.md` manda escalar em vez de resolver sozinho.

## Opções consideradas

| Opção | Prós | Contras |
|-------|------|---------|
| **A. Preferência global da aplicação** | Sem tocar no contrato | Dimensão vira estado do app, não do documento: o mesmo `.tlsproj` sai diferente em cada máquina. Quebra a reprodutibilidade do export |
| **B. Campos soltos em `project`** (`month_w`, `row_h`…) | Simples | Polui a raiz com 6 campos de apresentação misturados a dados de programa |
| **C. Objeto `project.layout` opcional, bump aditivo para 1.1** | Dimensão viaja com o documento; agrupada e isolável; 1.0 continua válido | Um build antigo lendo um arquivo 1.1 rejeita por `additionalProperties: false` |
| **D. Arquivo de tema separado** | Reaproveitável entre projetos | Mais um artefato para perder; nenhum pedido real de reuso ainda |

## Decisão

**Opção C.** `schema_version` passa a aceitar `["1.0", "1.1"]`; `project.layout`
é um objeto opcional com seis campos numéricos, todos com faixa declarada no
schema.

### Migração

- **1.0 → 1.1:** nenhuma transformação. `layout` ausente significa "use os
  padrões de SPEC-002 §2". O carregador apenas reescreve `schema_version`.
- **1.1 → 1.0:** remover `project.layout`. Perde-se a personalização, nada mais.
- Compatibilidade retroativa **não** é bidirecional: um build anterior a esta
  mudança recusa um arquivo 1.1. Como o app é distribuído como arquivo único,
  isso é gerenciável; se o parque de versões se espalhar, o carregador deve
  passar a ignorar chaves desconhecidas em vez de rejeitá-las.

## Consequências

- **Validação em vez de rejeição.** Valor fora da faixa é fixado no limite
  (`clampL`), nunca recusado — arquivo editado à mão continua abrindo.
- **Invariante de coerência:** `bar_h` é reduzido para `row_h − 2` quando
  excede a linha. Uma barra maior que a própria lane produziria sobreposição
  visual entre componentes.
- **A escala do texto é aplicada no fim**, sobre o display list inteiro, em vez
  de espalhada por cada chamada de texto. Um ponto de aplicação, não trinta.
  A checagem de "o rótulo cabe na barra?" usa o tamanho já escalado.
- Presets (Compacto / Padrão / Amplo) são só conjuntos de valores gravados em
  `layout`; não existe "modo preset" no documento. Depois de aplicar, o usuário
  ajusta qualquer campo individualmente sem sair de um estado nomeado.
- O tamanho resultante em px é mostrado ao lado dos controles — a dimensão
  personalizada precisa de retorno imediato para ser utilizável.

## Nota sobre o PDF

O tamanho de página personalizado (mm) **não** entra no contrato: é escolha do
momento da exportação, não propriedade do programa. Fica na UI.
