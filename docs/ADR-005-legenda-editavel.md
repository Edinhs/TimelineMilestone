# ADR-005 — Legenda editável: nomes e cores por projeto

**Status:** aceito · **Data:** 2026-08-25 · **Decisor:** Ederson

## Contexto

A caixa "Components" tinha cinco linhas fixas, com nomes em inglês e cores
cravadas no código (`STATUS` em SPEC-002 §3). Programas diferentes usam
vocabulário diferente — "Ontime" vira "No prazo", "Attention Point" vira "Ponto
de atenção", e nem toda área usa a mesma convenção de cor. Editar exigia mexer
no código.

## A tensão

O status é ao mesmo tempo **dado** e **apresentação**:

- `activities[].status` é um enum de cinco chaves. Atividades apontam para ele,
  a validação depende dele, o importador mapeia para ele.
- O nome e a cor que aparecem na tela são pura apresentação.

Deixar o usuário editar a segunda coisa é trivial. Deixar editar a primeira —
criar um sexto status, renomear a chave — quebraria o enum, invalidaria
documentos existentes e obrigaria migração de todos os arquivos salvos.

## Decisão

**Chaves fixas, aparência editável.** `project.legend` sobrescreve `label`,
`fill`, `stroke`, `text` e `hidden` de cada uma das cinco chaves conhecidas,
mais o título da caixa. As chaves permanecem `ontime`, `delayed`, `concluded`,
`concluded_delay` e `attention` — ninguém as vê, e é isso que as mantém
estáveis.

Bump aditivo **1.2 → 1.3**, mesma mecânica dos anteriores: campo opcional,
ausência significa padrão, sem migração.

### Padrão sempre restaurável

Os valores de SPEC-002 §3 continuam sendo a fonte da verdade quando não há
sobrescrita. Um botão **Restaurar padrão** apaga `project.legend` inteiro —
não grava os valores padrão de volta. A diferença importa: um documento sem
`legend` acompanha futuras correções da paleta; um documento com a paleta
padrão *copiada* congela a versão de hoje. Restaurar deve devolver ao estado
"sem opinião", não ao estado "opinião igual à minha".

### Tolerância a lixo

Cor fora do formato `#RRGGBB` ou rótulo vazio **cai no padrão em silêncio**,
nunca rejeita o arquivo. Mesma política de `project.layout` (ADR-003): é
preferência de apresentação, não dado de programa.

## Consequências

- A caixa de legenda passa a ter largura calculada a partir do rótulo mais
  longo. Com nomes fixos em inglês dava para cravar 118 px; com "Ponto de
  atenção" não dá.
- O seletor de status na aba Timeline e a tooltip do gráfico passam a mostrar o
  rótulo do projeto, não o rótulo padrão. Quem renomeou "Ontime" para "No prazo"
  precisa ver "No prazo" em todo lugar, senão a renomeação vira ruído.
- **O importador precisa aceitar os dois vocabulários.** Um bloco exportado com
  rótulos personalizados tem que voltar para as chaves certas, então
  `parseBlock` consulta os rótulos resolvidos do projeto antes de recorrer à
  tabela de sinônimos padrão.
- Contraste do texto sobre a barra vira responsabilidade do usuário. A UI
  mostra o par cor/texto lado a lado para que o problema seja visível, mas não
  impede uma combinação ruim — travar isso seria paternalismo num campo
  explicitamente estético.

## Não fazer (por ora)

Criar, remover ou reordenar status. Exigiria transformar o enum em lista aberta,
com migração de todo documento existente e uma regra para o que acontece com
atividades cujo status foi apagado. Se aparecer necessidade real, é ADR próprio
e bump maior — não um ajuste de legenda.
