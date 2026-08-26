---
name: timeline-project-schema
description: Contrato de dados de um projeto de cronograma (milestones, grupos, componentes, atividades, marcadores), regras de validação E0xx/W1xx e cálculo de duração em semanas/meses. Use ao ler, gerar, validar, migrar ou converter arquivos .tlsproj, fixtures de timeline, ou ao mapear planilhas Input Milestone / Input Timeline para o modelo.
---

# Contrato do projeto de cronograma

Fonte normativa: `contracts/project.schema.json` (`schema_version: "1.0"`).

## Estrutura
```
project     name, last_update, chart_start, chart_end, today, duration_unit
milestones  id, label, date, style(gate|xgate|today|custom), show_line, show_marker
groups      id, label, order
components  id, name, group_id, order
activities  id, component_id, name, start, end, status, lane, markers[]
markers     label, date, shape(triangle_down|diamond|flag)
```

## Invariantes
- Datas sempre ISO `YYYY-MM-DD`, **valores estáticos** — nunca fórmula, nunca
  referência a outra célula.
- IDs únicos por coleção; `component_id` e `group_id` devem existir.
- Duas atividades do mesmo componente **e** mesma `lane` não podem se sobrepor.
- Duração é **derivada**, nunca armazenada nem editável pelo usuário.

## Duração
```python
weeks  = max(1, round((end - start).days / 7))
months = max(1, (end.year-start.year)*12 + (end.month-start.month) - (end.day < start.day))
```
Rótulo: `56W`, `13M`. Espelha o UDF VBA `calcula_intervalo(inicio, fim, "m"|"w")`
— confirme a definição de semana antes de congelar.

## Códigos de validação
`E001` fim<início · `E002` id duplicado · `E003` component_id órfão ·
`E004` group_id órfão · `E005` sobreposição na mesma lane · `E006` janela do eixo inválida
`W101` fora da janela · `W102` marcador fora da barra · `W103` marco fora da janela ·
`W104` componente vazio · `W105` rótulo não cabe na barra

Erros bloqueiam export; avisos não.

## Ao mapear de planilha
Ler por **nome de cabeçalho**, nunca por índice de coluna. Datas aceitas:
ISO, `DD/MM/YYYY`, serial Excel. Linha sem data obrigatória vira `Issue` —
nunca inferir nem preencher silenciosamente.
