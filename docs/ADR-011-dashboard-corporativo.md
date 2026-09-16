# ADR-011 — Dashboard corporativo e navegação superior compacta

**Status:** aceito · **Data:** 2026-09-09 · **Decisor:** Ederson

## Contexto

A interface precisava se aproximar de um produto corporativo de planejamento:
hierarquia mais clara, leitura executiva imediata e maior consistência entre
navegação, indicadores e Preview. A navegação lateral consumia largura
permanente do editor e separava as abas das ações do mesmo fluxo de trabalho.

## Decisão

- Desktop e telas menores usam um único menu superior claro de 58 px, reunindo
  marca, seções, seleção do projeto, arquivo, exportação, tema e ajuda.
- As seções formam uma faixa compacta com rolagem horizontal própria quando o
  espaço diminui; nenhuma segunda barra de navegação é criada.
- A Visão geral apresenta nome e situação do programa, período e seis KPIs:
  progresso, próximo milestone, atrasos, milestones, componentes e janela.
- Cartões usam superfícies brancas, bordas discretas, elevação leve e cor forte
  somente para ação ou estado.
- O tema inicial é claro; automático e escuro permanecem disponíveis.
- Abaixo de 760 px, o menu pode quebrar suas ações dentro do mesmo cabeçalho e
  editor e Preview são empilhados.
- O divisor do ADR-009 permanece: editor limitado a 50% da área útil, com
  mouse, teclado e restauração por duplo clique.

## Consequências

A navegação deixa de consumir largura no desktop e mantém todas as ações em uma
faixa superior coerente. O limite do editor passa a considerar somente o
divisor, preservando metade da área de trabalho para a Preview. O contrato JSON
e as exportações não são alterados.

## Validação

A suíte de interface verifica a marca, a navegação superior única, os seis
KPIs, o status junto ao título e os limites do divisor. A
homologação visual em navegador continua sendo um gate separado.
