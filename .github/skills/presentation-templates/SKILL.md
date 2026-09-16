---
name: presentation-templates
description: "Cria biblioteca e arquivos reutilizáveis de modelos de apresentação do Timeline Studio. Use para salvar modelo, importar modelo, aplicar template, reutilizar deck, galeria de layouts, projeto de demonstração ou compartilhar apresentações sem localStorage e sem alterar o contrato do projeto."
argument-hint: "Fluxo de modelo, biblioteca ou exemplo a implementar"
---

# Modelos de Apresentação

## Princípio

Um modelo é autoria reutilizável, não estado automático do navegador. Salve-o em
arquivo escolhido ou download explícito. O projeto continua autocontido em
`project.deck`; o arquivo de modelo é apenas uma forma de transportar uma cópia.

## Envelope recomendado

Use uma extensão dedicada `.tlstpl` com JSON UTF-8:

```json
{
  "template_version": "1.0",
  "kind": "timeline-studio-deck-template",
  "name": "Revisão de marco",
  "description": "Deck executivo 16:9",
  "created_at": "2026-08-26T12:00:00.000Z",
  "deck": { "theme": {}, "slides": [] }
}
```

Não acrescente esse envelope ao `project.schema.json`. Se o formato passar a ser
referenciado por workspace ou persistido dentro do projeto, pare e envolva o
`spec-guardian`.

## Exportar

1. Exija pelo menos um slide.
2. Clone apenas `project.deck`; não inclua milestones, atividades ou outros dados.
3. Remova estado transitório e propriedades internas iniciadas por `_`.
4. Preserve `role`, `locked`, imagens autorais e elementos `chart` sem rasterização.
5. Gere nome de arquivo seguro e informe tamanho quando imagens o tornarem pesado.

## Importar e aplicar

1. Aceite somente JSON local e valide `kind`, versão, deck, slides e elementos.
2. Rejeite propriedades ou tipos perigosos; imagens devem ser data URI PNG/JPEG.
3. Clone o deck e remapeie todos os IDs de slides e elementos.
4. Preserve o projeto atual; substitua apenas `project.deck` após confirmação.
5. Reaplique a capa com `buildCover()` para restaurar geometria e travas.
6. Se o modelo possuir `chart`, mantenha-o derivado do projeto que recebeu o modelo.
7. Marque como alterado e selecione o primeiro slide.

## Exemplo profissional

O projeto demonstrativo deve ser anônimo, usar dados plausíveis e abrir com um deck
pronto: capa, resumo executivo, cronograma, marcos, fornecedores, riscos e próximos
passos. Varie layouts e hierarquia, mas não adicione dados reais nem mídia protegida.

## Testes

Cubra round-trip exportar→importar, remapeamento de IDs, rejeição de envelope
inválido, proteção da capa e preservação do projeto fora de `project.deck`.