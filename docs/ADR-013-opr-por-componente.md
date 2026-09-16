# ADR-013 — Uma OPR individual por componente

**Status:** aceito · **Data:** 2026-09-14 · **Decisor:** Ederson

## Contexto

Um único slide OPR com o cronograma completo mistura componentes diferentes e
obriga o usuário a separar o conteúdo manualmente. O requisito é que cada
componente tenha seu próprio one-pager, criando vários slides quando necessário.

## Decisão

A ação **Gerar por componentes** sincroniza exatamente um slide vinculado para
cada `components[].id`. O contrato sobe de 1.12 para 1.13 com duas propriedades
opcionais e aditivas:

| propriedade | função |
|---|---|
| `slide.opr_component_id` | identifica o componente representado pelo slide OPR |
| `chart.component_id` | filtra a faixa compacta pelas atividades e marcadores desse componente |

Os marcos do programa permanecem em todas as faixas, pois representam gates
comuns. O título padrão combina nome do componente e fornecedor.

## Sincronização e preservação

1. Reutilizar primeiro o slide que já possui o mesmo `opr_component_id`.
2. Para componentes ainda sem slide, reaproveitar OPRs legados ou livres na
   ordem em que aparecem no deck.
3. Criar somente os slides restantes.
4. Preservar IDs, títulos já personalizados, demais textos, riscos, imagens e
   outros conteúdos autorais nas sincronizações seguintes.
5. Manter OPRs excedentes como slides livres, removendo apenas o vínculo
   duplicado ou inválido.

A execução é idempotente. O limite de 60 slides é verificado antes da primeira
criação; se não houver capacidade, nada é criado parcialmente.

## Renderização e exportação

O filtro entra como argumento da mesma `buildCompactDisplayList` usada pelo
preview. O PPTX continua usando o mesmo exportador, mas a chave do cache passa a
ser `variant + component_id`. Assim, slides de componentes distintos nunca
reutilizam a imagem de outro componente.

## Compatibilidade

Documentos 1.12 e anteriores continuam válidos. Ausência dos novos campos
significa OPR livre e chart sem filtro, reproduzindo o comportamento anterior.
Ao abrir e salvar na versão atual, a normalização atualiza `schema_version` para
1.14; o vínculo definido aqui permanece opcional e compatível.

## Alternativas descartadas

- Um slide por fornecedor: dois componentes do mesmo fornecedor ainda
  permaneceriam misturados.
- Duplicar o projeto inteiro por componente: criaria múltiplas fontes de verdade.
- Exportar filtros somente no PPTX: o preview deixaria de ser WYSIWYG.
- Apagar OPRs excedentes: poderia destruir conteúdo manual sem autorização.
