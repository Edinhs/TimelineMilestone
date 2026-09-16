# Estado atual do Timeline Studio

**Atualizado em:** 2026-09-14
**Aplicação:** 0.3.0  
**Contrato de projeto:** 1.14
**Fase:** protótipo funcional em homologação

## O que está implementado

- Aplicação offline em `app/timeline-studio.html`.
- Navegação: Visão geral, Apresentação, OPR, Projeto, Milestones e Timeline.
- Aba OPR: geração e sincronização de um slide por componente, com cronograma
  compacto filtrado, tabela nativa Next Steps e Scope/Risk opcional e reversível.
- Edição direta dos textos no palco e inserção, troca ou remoção de imagens
  livres no OPR, com arraste, redimensionamento e exportação para PPTX.
- Pop-up contextual nas caixas de texto com fonte, tamanho, cor, negrito,
  itálico, sublinhado, alinhamento e restauração do estilo.
- Cronograma compacto como variante do elemento `chart`.
- Dashboard corporativo claro com menu superior único e compacto, navegação
  horizontal responsiva e editor redimensionável até 50% da área útil.
- Na Visão geral, cabeçalho do programa com situação explicável e seis KPIs:
  progresso, próximo milestone, atrasos, milestones, componentes e janela.
- Preview SVG interativo, zoom, ajuste, tela cheia e validação navegável.
- Dois modelos de eixo: Ano > Mês e Mês > Semana ISO (`WeekNN`).
- Marcadores individuais exibem rótulo e data no cronograma.
- CRUD de projetos, milestones, componentes, atividades e marcadores.
- Ocultação individual reversível de componentes e milestones.
- Legenda, dimensões, temas e identificação configuráveis.
- Visão geral com status explicável, indicadores, prioridades, auditoria,
  fornecedores e escopo visível.
- Histórico de versões baseado em diferenças após salvamento bem-sucedido.
- Workspace multiprojeto, salvamento manual/automático e detecção de conflito.
- Editor de apresentações com alinhamento, camadas, clipboard, notas, ordem de
  slides, modelos externos `.tlstpl` e exemplo executivo pronto.
- Capa corporativa Stellantis de tela inteira, com fundo offline restaurável,
  duas logos separadas e textos editáveis. A geração automática cria somente
  a capa e o cronograma; a OPR permanece individual por componente.
- Exportadores PNG, PDF, SVG, CSV, XLSX e PPTX.

## Evidência automatizada

Comando: `npm test`

| Grupo | Resultado |
|---|---:|
| Núcleo | 74 aprovados, 0 falhas |
| Interface | 63 aprovados, 0 falhas |
| Total | **137 aprovados, 0 falhas** |

A suíte cobre sintaxe, domínio, cálculos, render, auditoria, exportadores,
salvamento, conflitos, histórico, visibilidade individual, tela cheia,
navegação superior responsiva, contenção de tabelas, limites do divisor, modelos de
apresentação, capa corporativa, OPR por componente, Next Steps editável, contexto
opcional preservado, segurança de mídia, clipboard, alinhamento e limites do deck.

## O que ainda não está comprovado como entrega

- Homologação visual completa pelo usuário no navegador-alvo.
- Empacotamento e execução como `.exe` em máquina limpa.
- Paridade final do cálculo de semanas com o VBA real.
- Importação automatizada de variantes reais do `.xlsm` legado.
- Escrita atômica e backups rotativos da arquitetura Python planejada.
- Métricas NF-01, NF-02 e NF-04 medidas no binário final.
- Aprovação de TI/antivírus para distribuição corporativa.

## Gates

| Etapa | Status | Evidência ou próximo passo |
|---|---|---|
| Desenvolvimento do protótipo | aprovado | aplicação funcional e suíte verde |
| Testes automatizados | aprovado | 137/137 |
| Homologação visual | em andamento | validar jornadas e responsividade no ambiente-alvo |
| Correções de homologação | aguardando | tratar achados do aceite visual |
| Build nativo | não iniciado | executar SPEC-005 |
| Deploy/entrega | não iniciado | depende do build, smoke e aceite de TI |

## Regra de comunicação

Build verde, HTTP 200, arquivo exportado ou teste unitário isolado não significam
release pronta. Use este documento para distinguir capacidade implementada,
evidência automatizada, homologação e prontidão operacional.
