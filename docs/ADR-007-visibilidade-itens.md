# ADR-007 — Visibilidade individual no cronograma

## Contexto

Componentes e milestones podiam ser excluídos, mas não temporariamente retirados
do cronograma. Usar exclusão para esse objetivo também removia dados e, no caso
do componente, todas as suas atividades.

## Decisão

O schema 1.7 acrescenta o campo booleano opcional `hidden` em `components[]` e
`milestones[]`. Ausente ou `false` significa visível, preservando a leitura de
arquivos anteriores.

- Componente oculto não participa do layout nem do desenho; suas atividades
  permanecem salvas, editáveis, auditáveis e disponíveis nas exportações de dados.
- Milestone oculto não desenha rótulo, linha ou marcador; seus demais atributos
  permanecem intactos.
- PDF, PNG e SVG derivados do cronograma respeitam a visibilidade.
- CSV, XLSX e o arquivo de projeto preservam todos os registros.

## Consequências

A ação é reversível e não exige migração destrutiva. Aplicações antigas que
validem `additionalProperties: false` não aceitam o novo campo, por isso o bump
de `schema_version` de 1.6 para 1.7 é obrigatório ao salvar.
