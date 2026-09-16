# SPEC-008 — OPR por componente

**Dono:** `ui-builder` + `io-integrator`  
**Depende de:** ADR-010, ADR-013, ADR-015 e SPEC-007

## 1. Objetivo

A OPR é um slide nativo do deck, não um relatório paralelo. Cada componente
recebe um slide próprio com:

1. faixa de título e marca Stellantis;
2. Project Chief e semáforo geral;
3. cronograma compacto filtrado pelo componente;
4. tabela editável **Next Steps**;
5. bloco opcional **Scope / Risk/Open Points**.

Preview, edição na aba Apresentação e exportação `.pptx` usam exatamente os
mesmos elementos.

## 2. Geometria do slide

Palco 960 × 540 px.

| parte | `role` | geometria | comportamento |
|---|---|---|---|
| faixa | `opr-band` | 0 / 35 / 762 × 27 | navy, travada |
| título | `opr-title` | 42 / 35 / 670 × 27 | branco, editável |
| logo | `opr-logo` | 780 / 31 / 161 × 34 | proporção preservada |
| confidencialidade | `opr-conf` | 861 / 8 / 99 × 14 | vermelho |
| Project Chief | `opr-chief-box`, `opr-chief` | 50 / 76 / 260 × 25 | cabeçalho executivo |
| status | `opr-status` | 320 / 76 / 96 × 25 | verde, amarelo, vermelho ou apagado |
| cronograma | `opr-chart` | 220 / 106 / 704 × 206 | `variant: compact` |
| Next Steps sem contexto | `opr-next-steps` | 36 / 330 / 888 × 184 | ocupa a base toda |
| Next Steps com contexto | `opr-next-steps` | 365 / 330 / 559 × 184 | divide a base |
| contexto | papéis `opr-scope-*` e `opr-risk-*` | 36 / 330 / 304 × 184 | opcional, lado esquerdo |

O layout base usa 17 elementos, abaixo do limite de 40, deixando espaço para
imagens livres adicionadas pelo usuário.

## 3. Tabela Next Steps

É um elemento `table` nativo, com cabeçalho:

`Next Steps | Start Date | Close Date | Lead Name`

Na primeira geração, até seis atividades do componente são ordenadas por início
e copiadas para as linhas. Datas usam `DD-Mmm-AA`, por exemplo `03-Nov-25`.
`Lead Name` recebe o fornecedor do componente. Linhas faltantes ficam vazias.

As proporções são 53% / 15% / 15% / 17%. O cabeçalho usa cinza `#B7B7B7`,
texto `#111111` e toda a grade usa contorno `#111111`. A tabela é editável no
palco e continua sendo uma tabela no PowerPoint, não uma imagem.

Sincronizar novamente preserva células já editadas. A ação **Atualizar Next
Steps** é explícita e pede confirmação antes de substituir as linhas pelas
atividades atuais.

## 4. Scope e Risk/Open Points opcional

A opção **Incluir Scope e Risk/Open Points** alterna dois blocos empilhados à
esquerda. Desativada, a tabela ocupa a largura inferior inteira.

Os elementos opcionais permanecem no documento com `hidden: true`. Assim, o
texto não é perdido ao ocultar e reexibir. Elementos ocultos não entram no
palco nem no OOXML do `.pptx`.

`opr-scope-body` e `opr-risk-body` aceitam várias linhas, edição direta no slide
e edição pelos campos da aba OPR.

## 5. Um slide por componente

**Gerar por componentes** sincroniza um OPR para cada `components[].id`, inclusive
componentes ocultos. `slide.opr_component_id` identifica o componente e
`opr-chart.component_id` filtra as atividades e marcadores. Os marcos globais
continuam em todos os cronogramas.

O título padrão é `Componente | Fornecedor`. A execução é idempotente e valida o
limite de 60 slides antes de criar qualquer um. Slides OPR excedentes ficam
livres, sem vínculo.

## 6. Compatibilidade e preservação

Reaplicar a composição devolve posições e dimensões sem apagar título, status,
células, Scope, Risk ou imagens livres. O contrato 1.14 adiciona somente
`element.hidden`; ausência equivale a visível.

Na migração da antiga grade de cards, conteúdo autoral existente é reunido no
bloco Risk/Open Points, que fica visível automaticamente. Cards vazios de
template não geram ruído.

## 7. Aba OPR

Ações disponíveis:

- gerar/sincronizar um slide por componente;
- criar OPR livre;
- reaplicar a composição;
- escolher o componente do slide;
- editar título, confidencialidade, status, Scope e Risk;
- ativar/desativar o contexto opcional;
- abrir a tabela já selecionada na aba Apresentação;
- atualizar Next Steps a partir do cronograma;
- adicionar, trocar e remover imagens livres.

## 8. Testes obrigatórios

1. cronograma e tabela nascem com geometria correta e até 40 elementos;
2. tabela recebe somente atividades do componente e datas `DD-Mmm-AA`;
3. contexto alterna entre tabela cheia e dividida sem perder texto;
4. recomposição preserva células, textos, status e imagens livres;
5. colunas respeitam 53/15/15/17 no palco e no PPTX;
6. cabeçalho cinza e grade preta chegam ao OOXML;
7. elementos `hidden` não chegam ao PPTX e são validados pelo contrato;
8. botão de Apresentação seleciona a tabela para edição;
9. geração por componente permanece filtrada, idempotente e transacional no
   limite de 60 slides;
10. conteúdo da grade antiga migra sem perda de autoria.
