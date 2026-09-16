# PRD — Timeline Studio

**Versão:** 0.4 · **Autor:** Ederson · **Atualizado em:** 2026-08-26
**Status:** protótipo funcional em homologação; empacotamento nativo pendente

---

## 1. Contexto

Hoje o time PHES gera cronogramas de programa em um workbook macro-habilitado
(`Schedule Generator Tool v09`, .xlsm). Duas tabelas de entrada —
**Input Milestone** e **Input Timeline** — alimentam uma macro VBA que
*desenha* o Gantt na aba `Timeline` usando shapes DrawingML posicionadas por
código. A saída de referência é a imagem anexada a este repositório
(`docs/assets/referencia.png`): programa "TESTE", eixo 2025→2029,
componentes de infotainment (Audio base/premium, Cluster 7"&10", DCSD 12.3")
e marcos PM, CM, SFM, SHRM, X0–X3, SOPM.

### Problemas do estado atual

| # | Dor | Evidência |
|---|-----|-----------|
| P1 | Depende de macros habilitadas + Excel desktop; qualquer política de segurança quebra o fluxo | `.xlsm`, VBA, controles ActiveX |
| P2 | Manutenção frágil: a arte é DrawingML gerada por VBA; ferramentas modernas destroem o arquivo | openpyxl `keep_vba=True` apaga ~99% do DrawingML; LibreOffice não re-salva após editar VBA |
| P3 | Um arquivo por projeto → portfólio espalhado, índice duplicado e desatualizado | aba `Projetos` replicada em cada `Timing_XXX.xlsm` |
| P3b | Trocar de projeto exige fechar e abrir outro arquivo | fluxo do hub legado |
| P3c | Não existe onde registrar o fornecedor responsável por cada componente | a informação vive em e-mail |
| P4 | Sem validação de entrada: fórmula auto-referenciada real encontrada em `Final Date` | linhas 9/21/33/45 do `InputTimeline` |
| P5 | Nenhuma exportação programática (PNG/PDF/SVG) para colar em apresentação | print de tela manual |

## 2. Visão

Um **aplicativo executável único (.exe, sem instalação, offline)** que
reproduz — e supera — a saída visual do Schedule Generator, com Visão geral,
Projeto, Milestones, Timeline e Apresentação, validação em tempo real, Preview
do Gantt ao vivo e exportação para PNG/PDF/SVG/XLSX/PPTX.

> *Nem VBA, nem macro, nem dependência de Excel. O workspace `.tlsws` contém os
> projetos que seguem o contrato JSON; o desenho é derivado, nunca editado à mão.*

## 3. Público-alvo e personas

- **PL / Program Leader (primário):** monta e atualiza o cronograma semanalmente,
  precisa exportar rápido para o pack de milestone review.
- **Engenheiro de componente (secundário):** atualiza status de 2–3 linhas
  (Sourcing atrasado, DV concluído) sem quebrar o resto.
- **Gestor de portfólio (futuro, v2):** vê N projetos consolidados.

## 4. Escopo

### 4.1 Dentro do escopo (v1.0)

A tabela define o alvo da v1.0; não significa que todos os itens já estejam
entregues. O estado comprovado de cada frente está em `STATUS-ATUAL.md`.

| ID | Requisito |
|----|-----------|
| F-01 | **Milestones**: CRUD de marcos globais (id, label, data, estilo gate/xgate, mostrar linha, mostrar marcador) |
| F-02 | **Timeline**: CRUD de componentes e atividades (nome, início, fim, status, lane, marcadores ancorados) |
| F-03 | Cálculo automático de duração em semanas (`W`) e meses (`M`), equivalente ao UDF `calcula_intervalo` |
| F-04 | Render do Gantt em SVG: cabeçalho ano/mês, grid mensal, linha "Today", linhas verticais de marco, barras coloridas por status, marcadores triangulares rotulados, legenda "Components", logo e "Last update on" |
| F-05 | Preview ao vivo (mudança na tabela → redesenho < 150 ms) |
| F-06 | Validação: fim ≥ início, IDs únicos, atividades da mesma lane sem sobreposição, datas dentro da janela do eixo, marcador dentro da barra |
| F-07 | Salvar/abrir projeto como `.tlsproj` (JSON conforme `contracts/project.schema.json`) |
| F-08 | Exportar PNG (300 dpi), PDF (A3 paisagem), SVG |
| F-09 | Exportar XLSX legível (abas `Input Milestone`, `Input Timeline`) para conviver com o fluxo atual |
| F-10 | Importar do `.xlsm` legado: ler as abas de entrada (somente leitura, nunca re-salvar o .xlsm) |
| F-11 | Empacotamento em `.exe` único, sem instalador e sem direitos de administrador |
| F-12 | **Portfólio em memória**: seletor de projeto ativo, criar/duplicar/renomear/excluir, alternância sem perda de dados |
| F-13 | Salvar workspace `.tlsws` (N projetos) e projeto isolado `.tlsproj`; indicador de alterações pendentes e aviso ao fechar |
| F-14 | **Dimensões personalizadas por projeto**: largura do mês, altura de linha e barra, painel, faixa de marcos e escala do texto, com predefinições Compacto/Padrão/Amplo |
| F-15 | Tamanho de página do PDF personalizado em mm, além de sob medida / A3 / A4 |
| F-16 | **Visão geral**: painel de consulta e auditoria com marcos do programa, marcos individuais por componente, resumo por fornecedor e achados `A2xx`, tudo derivado |
| F-17 | **Fornecedor por componente**, editável na Visão geral e na aba Timeline, exportado no Excel e no CSV |
| F-18 | **Legenda editável**: nome e cores de cada status por projeto, título da caixa, ocultar linhas, com padrão sempre restaurável |
| F-19 | **Responsável pelo cronograma** no cabeçalho do desenho, ao lado do rótulo de atualização, e na Visão geral |
| F-20 | **Aba Apresentação**: editor de slides com texto, imagem, formas e tabelas posicionáveis, capa corporativa personalizável, geração automática de capa + cronograma e exportação `.pptx` |
| F-21 | **Visibilidade individual reversível** de componentes e milestones, sem excluir dados; exports visuais respeitam a seleção |
| F-22 | **Histórico de versões por salvamento**: diferenças por campo, criado somente após gravação bem-sucedida |
| F-23 | **Preview em tela cheia**, incluindo zoom, desenho e validação, com saída pelo mesmo botão ou `Esc` |
| F-24 | **Workspace responsivo**: menu superior único e compacto, seções contidas e divisor ajustável; editor limitado a 50% da área útil |
| F-25 | **Resumo executivo acionável**: estado explicável, prioridades, cobertura de fornecedores, escopo visível e atalhos |
| F-26 | **Aba OPR**: gera e sincroniza um one-pager "Open Points and Risks" individual por componente, como slides do mesmo deck — faixa compacta filtrada, grade de cards da referência, semáforo editável, texto com estilo por trecho e linha de marcos |
| F-27 | **Cronograma compacto**: variante do elemento `chart` com régua de anos e meses, bandeirinhas de marco e fases em pistas, sem painel nem legenda |
| F-28 | **Formatação contextual de texto**: ao selecionar uma caixa no slide, abrir pop-up com fonte, tamanho, cor, negrito, itálico, sublinhado, alinhamento e restauração |

### 4.2 Fora do escopo (v1.0)

- Edição por arrastar-e-soltar das barras no canvas (v1.1).
- Multiusuário / servidor central / banco de dados.
- Dashboard consolidado de portfólio, comparando projetos lado a lado (v2 — ver §9).
  O v1.0 entrega o portfólio como **armazenamento e navegação** (F-12/F-13), não como visão analítica.
- Armazenamento automático no navegador (`localStorage`/IndexedDB) — ver ADR-002.
- **Escrever** dentro do `.xlsm` legado. Proibido: só leitura.
- Qualquer envio de dados de programa para fora da máquina do usuário.

## 5. Requisitos não-funcionais

| ID | Requisito | Alvo |
|----|-----------|------|
| NF-01 | Cold start do .exe | ≤ 4 s |
| NF-02 | Redesenho após edição | ≤ 150 ms para 200 atividades |
| NF-03 | Offline total | zero chamadas de rede em runtime |
| NF-04 | Tamanho do binário | ≤ 120 MB |
| NF-05 | Compatibilidade | Windows 10/11 x64 (ambiente corporativo Stellantis) |
| NF-06 | Confidencialidade | dados do programa só em disco local escolhido pelo usuário; sem telemetria |
| NF-07 | Fidelidade visual | export PNG comparável lado a lado com a referência (revisão humana) |

## 6. Arquitetura de alto nível — implementação atual

```
┌────────────── app/timeline-studio.html ──────────────┐
│ interface HTML/CSS/JS                                │
│  ├── Visão geral · Apresentação · OPR · Projeto      │
│  ├── Milestones · Timeline                           │
│  └── Preview SVG + validação                         │
│ núcleo JavaScript puro                               │
│  ├── domínio e cálculos                              │
│  ├── auditoria e validação                           │
│  ├── display list e render                           │
│  └── persistência e exportadores                     │
└──────────────────────────────────────────────────────┘
```

O `.exe` com pywebview/Python permanece arquitetura-alvo, não entrega atual.
A decisão original está em `docs/ADR-001-stack.md` e os gates de build em
`docs/SPEC-005-packaging.md`.

## 7. Métricas de sucesso

| Métrica | Baseline (.xlsm) | Meta v1.0 |
|---------|------------------|-----------|
| Tempo para montar um cronograma novo do zero | ~2 h | ≤ 30 min |
| Tempo para atualizar status semanal | ~20 min | ≤ 3 min |
| Erros de dado detectados só no review | frequentes (ex.: P4) | 0 (bloqueio na entrada) |
| Tempo para responder "o que venceu e não fechou?" | leitura manual do gráfico | consulta direta na Visão geral |
| Export pronto para apresentação | print de tela | 1 clique, 300 dpi |
| Montar o pack de milestone review | manual no PowerPoint | deck gerado e editável no próprio app |

## 8. Riscos e mitigações

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| R1 — Antivírus corporativo bloqueia .exe de PyInstaller | Alta | Alto | Assinar internamente ou distribuir como pasta `onedir` + `.bat`; validar cedo com TI |
| R2 — Fidelidade visual "não é igual ao Excel" | Média | Médio | Congelar `SPEC-002` com tokens visuais medidos na referência; revisão lado a lado obrigatória |
| R3 — Import do .xlsm legado quebrar em variantes de arquivo | Média | Médio | Import tolerante com relatório de linhas ignoradas; nunca falhar silenciosamente |
| R4 — Confidencialidade de dados de programa | Baixa | Muito alto | NF-03/NF-06; usar apenas fixtures anônimas em dev |
| R5 — Escopo crescer para portfólio antes da v1 fechar | Alta | Médio | §4.2 explícito; portfólio só na v2 |

## 9. Roadmap e estado

- **Protótipo v0.3 atual** — aplicação HTML offline, multiprojeto, editor,
  Preview, auditoria, histórico e exportadores; suíte automatizada verde.
- **Próximo gate** — homologação visual, paridade do cálculo legado e validação
  com arquivos anonimizados.
- **v1.0** — empacotamento Windows, smoke em máquina limpa e aceite operacional.
- **v1.1** — drag-and-drop nas barras, baseline vs atual, undo/redo.
- **v2.0** — portfólio analítico sobre o `.tlsws`: visão consolidada de todos os
  projetos, comparação de marcos e alertas de prazo (substitui de vez a aba
  `Projetos` replicada).

## 10. Decisões pendentes antes da release nativa

1. Confirmar `.exe` offline como canal final ou manter o HTML offline como
   distribuição transitória. O PRD continua assumindo `.exe` para a v1.0.
2. O XLSX exportado precisa ser abrível pela macro legada, ou é só leitura humana?
3. A janela do eixo (`chart_start`/`chart_end`) é sempre manual ou deve inferir do min/max das datas?
4. Semana = semana calendário ISO ou semana Stellantis (definição do `calcula_intervalo`)? — bloqueante para F-03.
