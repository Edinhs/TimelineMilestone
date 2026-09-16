# SPEC-006 — Visão geral: painel de consulta e auditoria

**Dono:** agente `ui-builder` (apresentação) + `domain-modeler` (`auditProgram`)
**Depende de:** SPEC-001 (domínio), ADR-004 (decisões e códigos `A2xx`)

## 1. Papel

A Visão geral responde cinco perguntas, nesta ordem de importância:

1. **Qual é o estado geral?** — saudável, atenção, crítico ou cadastro a revisar, sempre com evidência.
2. **O que exige ação agora?** — validação, atrasos, milestones próximos e cadastros incompletos.
3. **O que vem aí?** — próximo marco, prazo, o que atravessa ele.
4. **O que já venceu e não fechou?** — marcadores vencidos com atividade aberta.
5. **Quem é o responsável?** — fornecedor por componente e concentração de risco.

É a **aba padrão** do app. Somente leitura, exceto o campo de fornecedor, que é
editável no lugar (a informação costuma chegar justamente enquanto se consulta).
Toda tabela é navegável: clicar numa linha abre o item correspondente na aba de
edição.

## 2. `auditProgram(p)` — contrato da função

Pura, sem DOM, determinística. Nada do que ela devolve é gravado (ADR-004 §1).

```
auditProgram(p) -> {
  meta:      { name, owner, lastUpdate, today, window, months, components, activities, suppliers }
  gates:     [{ id, label, style, date, weeks, state, crossing, atRisk }]
  markers:   [{ id, component, supplier, activity, label, date, weeks, state, activityStatus }]
  suppliers: [{ name, components, activities, late, nextDate, nextLabel }]
  findings:  [{ code, level, message, ref }]
}
```

### Situação (`state`) — derivada de `project.today`

| valor | regra |
|---|---|
| `done` | data passada **e** atividade em `concluded`/`concluded_delay` |
| `overdue` | data passada **e** atividade não concluída |
| `soon` | data futura, dentro de 8 semanas |
| `future` | data futura, além de 8 semanas |
| `past` | (marcos) data passada — marco não tem atividade para "concluir" |

`weeks` é sempre assinado em relação a hoje: negativo = passado.

### Campos derivados dos marcos

- `crossing`: atividades cujo intervalo `[start, end]` contém a data do marco.
  É a leitura de auditoria mais pedida — "o que ainda está aberto quando o gate
  chegar".
- `atRisk`: subconjunto de `crossing` com status `delayed` ou `concluded_delay`.

## 3. Blocos da tela

| # | Bloco | Conteúdo | Interação |
|---|---|---|---|
| 1 | **Status executivo** | estado explicável, responsável, hoje, janela e última versão | — |
| 2 | **Indicadores** | próximo milestone, progresso, atrasos, cobertura e escopo visível | clique → área relacionada |
| 3 | **Prioridades agora** | ações derivadas de validação, atraso, prazo, cadastro e itens ocultos | clique → correção |
| 4 | **Marcos do programa** | Marco · Tipo · Data · Semanas · Situação · Em curso · Em risco | clique → Milestones |
| 5 | **Marcos individuais** | Componente · Fornecedor · Atividade · Marco · Data · Semanas · Situação | clique → a atividade; filtros: todos / vencidos / próximos 90 dias / por fornecedor |
| 6 | **Fornecedores** | Fornecedor · Componentes · Atividades · Em atraso · Próximo marco | clique → primeiro componente do fornecedor |
| 7 | **Achados** | lista `A2xx` com nível e mensagem | clique → item referido |

`computeOverview(p)` é pura e combina validação, KPIs e auditoria. O estado não
usa score numérico arbitrário: `Crítico` significa erro bloqueante; `Atenção`,
atraso ou risco; `Revisar cadastro`, fornecedor ausente; e `Saudável`, ausência
dessas condições.

Bloco 3 é o coração: é a tabela que o legado nunca teve, e a razão de existir da
aba. Os filtros são a interatividade que a torna auditável em vez de decorativa.

## 4. Regras de apresentação

- Situação usa cor **e** rótulo textual, nunca só cor (mesma regra de SPEC-003).
  `overdue` em `--err`, `soon` em `--warn`, `done` em `--ok`, `future` neutro.
- Semanas em monoespaçado tabular, com sinal explícito (`-12W`, `+17W`).
- Componente sem fornecedor mostra "— não informado" em `--txt-3`, não vazio:
  ausência precisa ser visível para ser corrigida.
- Tabela vazia mostra estado vazio com a ação que a preencheria.

## 5. Testes obrigatórios

1. `auditProgram` é determinística e não muta `p` (comparação de JSON antes/depois).
2. Cada `state` tem caso positivo em fixture.
3. `crossing` de um marco confere com contagem manual na fixture de referência.
4. Cada código `A201`–`A205` tem caso positivo e negativo.
5. Nenhum campo derivado aparece no `.tlsproj` salvo depois de abrir a Visão geral.
6. `computeOverview` apresenta evidência e prioridade coerentes com validação e atraso.

**Resultado da bateria na fixture de referência** (`today = 2026-08-15`):
`auditProgram` não muta o documento, é determinística, e o `crossing` do X0
(5 atividades) confere com a contagem manual. Os estados `overdue`/`done` e os
códigos `A202`/`A204` não são exercitados por essa fixture — todos os marcadores
dela estão no futuro — então são cobertos por um caso sintético que avança o
relógio para 2027-10-01. Documento saudável (fornecedores atribuídos, nenhum
atraso) produz zero achados.
