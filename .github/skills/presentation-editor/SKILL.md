---
name: presentation-editor
description: "Evolui a aba Apresentação e o editor de slides 16:9 do Timeline Studio. Use sempre que a tarefa mencionar palco, slides, elementos, texto, formas, imagens, tabelas, cronograma, seleção, alinhamento, distribuição, camadas, atalhos, duplicação, reordenação ou experiência semelhante ao PowerPoint."
argument-hint: "Capacidade de edição ou fluxo de autoria a implementar"
---

# Editor de Apresentações

## Objetivo

Construir uma bancada de autoria profissional sobre o modelo de `project.deck`,
preservando Preview/PPTX e as restrições institucionais da capa.

## Fontes normativas

Leia `CLAUDE.md`, `docs/ADR-006-apresentacao.md`,
`docs/SPEC-007-apresentacao.md` e `contracts/project.schema.json` antes de mudar
comportamento persistido.

## Procedimento

1. Comece no comando ou interação solicitada e siga até `curSlide()` e o elemento
   que realmente sofre mutação.
2. Verifique se os campos necessários já existem no schema 1.8. Se não existirem,
   mantenha estado transitório na UI ou escale ao `spec-guardian`; não improvise
   propriedades persistidas.
3. Implemente operações como funções puras sobre `slide.elements` quando possível.
   Isso permite testar alinhamento, distribuição e ordem sem depender do DOM.
4. Preserve elementos `locked`. Operações em lote devem ignorá-los e informar ao
   usuário quando nada puder ser alterado.
5. Mantenha posições finitas, dimensões mínimas de 8 px e elementos utilizáveis no
   palco 960 × 540. Comandos de alinhamento devem considerar o slide ou a caixa da
   seleção, nunca números visuais aproximados.
6. Use atalhos familiares apenas quando não colidirem com campos em edição:
   `Ctrl+C`, `Ctrl+X`, `Ctrl+V`, `Ctrl+D`, `Delete`, setas e `Shift`+setas.
7. Handler de `input` não remonta o painel. Atualize palco e amostras no lugar para
   preservar foco e cursor.
8. Marque o documento como alterado em toda mutação de autoria.

## Ferramentas prioritárias

- Seleção única e múltipla com indicação inequívoca.
- Copiar, recortar, colar e duplicar com IDs novos.
- Alinhar à esquerda, centro, direita, topo, meio e base.
- Distribuir horizontal e verticalmente quando houver três ou mais itens.
- Trazer à frente, avançar, recuar e enviar ao fundo.
- Reordenar, duplicar e excluir slides sem perder a seleção.
- Grade configurável, encaixe e movimento fino por teclado.
- Inserção e inspeção completas dos tipos permitidos pelo contrato.

## UX

Organize comandos por intenção: Slides, Inserir, Organizar, Elemento e Tema.
Desabilite comandos inaplicáveis e exponha tooltips. Confirme somente operações
destrutivas de grande alcance; ações locais devem permitir correção imediata.

## Validação

Após a primeira edição, rode `npm run test:ui`. Ao terminar, rode `npm test` e
inspecione a aba em navegador real nos tamanhos desktop e compacto. Cubra ao menos
uma operação pelo mouse, uma por teclado, uma em lote e a proteção de `locked`.