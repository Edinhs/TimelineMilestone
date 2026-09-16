---
name: presentation-pptx-qa
description: "Valida geração e compatibilidade de apresentações PPTX do Timeline Studio. Use sempre que buildPPTX, OOXML, slides exportados, imagens, tabelas, texto, posições EMU, tema ou abertura no PowerPoint forem criados, alterados, depurados ou revisados."
argument-hint: "Mudança de exportação PPTX ou arquivo a validar"
---

# Qualidade PPTX

## Objetivo

Garantir que o `.pptx` exportado seja estruturalmente válido, fiel ao palco 960×540
e editável no PowerPoint, sem depender de rede ou bibliotecas no runtime.

## Contrato de exportação

- Slide: 12192000 × 6858000 EMU.
- Conversão: 12700 EMU por px.
- Texto: `p:sp`; imagem e chart: `p:pic`; tabela: `p:graphicFrame`.
- O pacote precisa conter relacionamentos e mídias usados, sem entradas órfãs.
- `chart` é rasterizado somente no momento da exportação.

## Procedimento

1. Leia `docs/ADR-006-apresentacao.md` e `docs/SPEC-007-apresentacao.md`.
2. Gere um deck que exercite texto multilinha, forma, imagem, tabela e chart.
3. Inspecione o ZIP: partes obrigatórias, Content Types, relacionamentos e mídia.
4. Quando Python estiver disponível, abra com `python-pptx` e confira tamanho,
   contagem, tipos de shape, texto e posições de amostra.
5. Extraia texto para detectar conteúdo ausente e placeholders esquecidos.
6. Renderize ou abra o arquivo no ambiente-alvo e procure cortes, sobreposição,
   baixa resolução, contraste, desalinhamento e diferenças do palco.
7. Corrija e repita pelo menos uma verificação focada da área alterada.

## Casos obrigatórios

- Deck vazio produz um slide válido.
- Imagem PNG embutida aparece no ZIP e no relacionamento correto.
- Tabela preserva linhas e colunas.
- Texto com caracteres portugueses e quebras de linha permanece íntegro.
- Coordenadas conferem com `px × 12700`.
- Modelo importado exporta sem reaproveitar IDs conflitantes.
- Elemento chart usa o cronograma atual sem persistir sua imagem no projeto.

## Relatório

Informe os arquivos inspecionados, verificações executadas, resultado e qualquer
limitação que dependa do PowerPoint corporativo ou de homologação humana.