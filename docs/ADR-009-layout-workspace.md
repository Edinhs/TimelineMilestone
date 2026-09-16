# ADR-009 — Navegação superior e editor redimensionável

> **Status:** substituído parcialmente pelo ADR-011 em 2026-09-09. A decisão
> sobre o divisor permanece vigente; a navegação desktop ocupa o menu superior.

## Contexto

A navegação lateral consumia largura permanente e comprimida o editor. Depois
de movê-la para o topo, o painel de edição ainda precisava acomodar tabelas
largas sem retirar espaço demais da Preview.

## Decisão

- A navegação principal ocupa uma barra horizontal imediatamente abaixo do
  cabeçalho e permite rolagem horizontal quando necessário.
- Editor e Preview ficam lado a lado em telas acima de 760 px.
- Um separador vertical acessível permite personalizar a largura do editor
  durante a sessão.
- O editor tem mínimo preferencial de 280 px e máximo absoluto de 50% da área
  útil. A Preview preserva, portanto, pelo menos metade do workspace.
- O separador aceita mouse, setas, `Shift`, `Home`, `End` e duplo clique para
  restaurar a largura responsiva.
- Em telas de até 760 px, editor e Preview ficam empilhados e o separador é
  ocultado.
- Cada seção controla o próprio overflow horizontal; a janela principal não
  corta tabelas ou ações largas.

## Alternativas descartadas

### Manter a navegação lateral

Descartada porque reserva largura mesmo quando o usuário já escolheu a área de
trabalho e reduz simultaneamente editor e Preview.

### Permitir que o editor ultrapasse metade da tela

Descartada porque a Preview é a saída principal e precisa permanecer útil
durante a edição.

### Persistir a largura no navegador

Descartada porque o projeto proíbe `localStorage` e `sessionStorage`. O tamanho
é preferência efêmera da sessão, não dado do cronograma.

## Consequências

O layout ganha flexibilidade sem mudar o contrato JSON. O `ResizeObserver` da
Preview reajusta o zoom automático quando o divisor altera a largura. O teste
de interface valida posição da navegação, limites do divisor, restauração e
acessibilidade por teclado.
