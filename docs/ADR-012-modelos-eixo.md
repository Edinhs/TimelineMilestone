# ADR-012 — Modelos mensal e semanal do eixo

**Estado:** aceito  
**Data:** 2026-09-14  
**Decisão:** adicionar `project.axis_mode` e `project.layout.week_w` no contrato 1.12.

## Contexto

O cronograma oferecia somente a hierarquia **Ano > Mês**. O planejamento
semanal precisa enxergar semanas numeradas dentro do contexto do mês e do ano,
com rótulos inequívocos como `Week31` e `Week32`, sem perder a compatibilidade
visual e documental do modelo existente.

## Opções consideradas

1. Substituir o eixo mensal por semanas para todos os projetos. Rejeitada:
   altera arquivos antigos e torna cronogramas longos desnecessariamente largos.
2. Sobrepor semanas à mesma largura mensal. Rejeitada: quatro ou cinco rótulos
   `WeekNN` não cabem com legibilidade na célula de 24 px do mês.
3. Dois modelos persistidos, cada um com largura própria. **Escolhida.**

## Decisão

- `project.axis_mode = "month"` desenha **Ano > Mês** e permanece o padrão.
- `project.axis_mode = "week"` desenha **Mês/Ano > WeekNN**.
- Semana é ISO-8601, de segunda a domingo. A quinta-feira define número, ano e
  mês de agrupamento, evitando ambiguidade nas viradas de mês e de ano.
- `project.layout.week_w` controla a largura nominal semanal, padrão 28 px e
  faixa 20–72 px. `month_w` continua independente.
- A coordenada de barras, marcos e Today continua proporcional por dia; somente
  a granularidade, o cabeçalho, o grid e a largura total do eixo mudam.
- O cronograma compacto respeita a mesma escolha.

## Compatibilidade e migração

Os campos são opcionais. Arquivo sem `axis_mode`, inclusive contratos 1.0–1.11,
abre como `month`; ao normalizar para salvamento, o documento passa a 1.12. Não
há reescrita de datas, atividades ou marcos. Um valor desconhecido também cai no
modelo mensal em runtime, enquanto o JSON Schema o rejeita em validação formal.

## Consequências

O modelo semanal produz uma folha mais larga, necessária para preservar a
legibilidade de cada semana. Zoom, SVG, PNG, PDF, XLSX e PPTX continuam usando a
mesma display list, portanto não ganham um caminho de renderização paralelo.
