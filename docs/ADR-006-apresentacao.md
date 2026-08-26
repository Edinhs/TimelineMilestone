# ADR-006 — Aba Apresentação: deck no documento e PPTX escrito à mão

**Status:** aceito · **Data:** 2026-08-25 · **Decisor:** Ederson

## Contexto

O cronograma quase nunca é o entregável final: ele vira slide. Hoje o caminho é
exportar PNG, abrir o PowerPoint, colar, redimensionar, escrever o título de
novo, montar a tabela de marcos na mão — e refazer tudo na semana seguinte,
quando as datas mudam.

## 1. O deck vive dentro do documento do projeto

`project.deck`, bump aditivo **1.4 → 1.5**.

A alternativa era um arquivo separado (`.tlsdeck`). Descartada: um deck sem o
cronograma ao lado é um deck que desatualiza sozinho, e dois arquivos por
projeto reintroduzem exatamente o problema de dispersão que o `.tlsws` resolveu
(ADR-002). Um projeto, um arquivo, tudo junto — inclusive os slides.

**Consequência assumida:** imagens são embutidas como data URI, então um
`.tlsproj` com muitas fotos cresce rápido. É o preço de o arquivo ser
autocontido e offline. A UI avisa o tamanho do deck quando ele passa de 2 MB.

## 2. Conteúdo gerado é ponto de partida, não vínculo vivo

"Gerar do projeto" monta capa, cronograma, marcos, fornecedores e achados a
partir dos dados atuais. Depois disso, **os slides são independentes**: editar
uma data no cronograma não reescreve o slide já montado.

Foi decisão consciente, contra o instinto de manter tudo sincronizado. Um slide
que se reescreve sozinho apaga o ajuste manual que o usuário fez às 23h antes da
reunião — e a perda é silenciosa. O caminho é o oposto: regerar é um clique
explícito, e o botão diz que vai substituir o que está lá.

Isso não contradiz a regra 8 do `CLAUDE.md` ("nada derivado é armazenado"): a
Home continua sendo consulta pura e sempre recalculada. O deck é **autoria**,
não relatório — o que o usuário escreveu num slide é dado dele, não derivação.

## 3. PPTX escrito à mão, como o XLSX

Mesma decisão do ADR de interoperabilidade: OOXML montado em zip por código
próprio, sem biblioteca e sem CDN. O app continua sendo um arquivo só que roda
offline em máquina corporativa.

Partes mínimas geradas: `presentation.xml`, um `slideMaster`, um `slideLayout`,
um `theme`, N slides e as mídias. Slides usam `p:sp` (texto e formas),
`p:pic` (imagens) e `p:graphicFrame` com `a:tbl` (tabelas). Tamanho do slide:
12192000 × 6858000 EMU (16:9).

**Palco de 960×540 px, conversão de 12700 EMU por px.** O editor trabalha em
pixels porque é o que o mouse fala; a conversão acontece só na exportação.
Números redondos evitam deriva de arredondamento entre o que se vê e o que sai.

## 3b. Capa travada

A primeira página é identidade da empresa, não espaço de autoria. Ela é montada
a partir de um template fixo (SPEC-007 §4.1) com todos os elementos marcados
`locked`: posição, tamanho, cores e o logo não são editáveis; texto e imagem de
fundo são.

Isso exigiu `role` e `locked` no elemento de slide — bump aditivo **1.5 → 1.6**.
`role` já era usado internamente pelo código com o nome `_role`, fora do
contrato: um campo que o schema rejeitaria se alguém validasse o arquivo. Foi
corrigido junto, e é o tipo de dívida que aparece justamente quando se escreve
o contrato antes do código e depois se cede à pressa.

## 4. Padrão pré-configurado, personalização por cima

Cinco layouts (`title`, `content`, `chart`, `table`, `blank`) e um tema com
quatro tokens (`accent`, `bg`, `fg`, `font`). Ausência = padrão institucional,
mesma política de ADR-003 e ADR-005: valor inválido cai no padrão em silêncio,
e restaurar o padrão apaga a sobrescrita em vez de copiá-la.

## Não fazer (por ora)

- Animações, transições e vídeo.
- Editar o slide master ou criar layouts novos pela UI.
- Reabrir um `.pptx` existente. Escrever OOXML é bem mais simples que ler todas
  as variações que o PowerPoint produz; importar exigiria um parser completo
  para ganho pequeno.
