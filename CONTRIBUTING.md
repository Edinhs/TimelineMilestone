# Como trabalhar neste repositório

## Antes de qualquer mudança

Leia `CLAUDE.md`. As regras de lá não são estilo — cada uma existe porque algo
quebrou antes.

## O ciclo

```bash
npm install        # só na primeira vez (jsdom, usado nos testes de interface)
npm test           # sintaxe + núcleo + interface
```

`npm test` precisa passar antes de qualquer commit. A suíte de interface carrega
o app inteiro em jsdom e captura `window.onerror`: é ela que pega o tipo de
defeito que a checagem de sintaxe não vê — variável não declarada, foco perdido
a cada tecla, laço de `ResizeObserver`.

## Onde mexer

O app é **um arquivo**: `app/timeline-studio.html`. Dentro dele:

| bloco | conteúdo |
|---|---|
| `ENGINE START … ENGINE END` | núcleo puro: domínio, validação, layout, render, auditoria, exportadores |
| depois do `ENGINE END` | estado, painéis, interação |

O bloco do núcleo é extraído e testado sem navegador (`tests/harness.mjs`).
Mantenha-o **sem DOM**: se precisar de `document`, o código pertence à outra
metade.

## Contrato

`contracts/project.schema.json` é congelado. Campo novo exige bump de
`schema_version`, plano de migração e um ADR. Ver `docs/ADR-003` a `ADR-009`
para o padrão já estabelecido — todos aditivos, nenhum com migração destrutiva.

## Documentação

Feature nova atualiza a SPEC correspondente **antes** do código, não depois.
Decisão com alternativa descartada vira ADR numerado.

Antes de descrever uma capacidade como entregue, confira
`docs/STATUS-ATUAL.md`. Arquitetura-alvo, build planejado ou teste unitário não
substituem homologação visual, smoke do executável ou validação com arquivo real.
