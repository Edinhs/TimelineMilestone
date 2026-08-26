# Timeline Studio

Gerador de cronogramas de programa (Gantt + milestones) como **aplicativo
executável offline** — substituto do workbook macro `Schedule Generator Tool`.

> **Status: Wave 1 parcial.** Contrato, PRD, ADR e SPECs prontos + **app inicial rodando no navegador**.

## Rodar agora

Abra `app/timeline-studio.html` no navegador (duplo clique). Arquivo único,
sem instalação, sem servidor, sem internet — o mesmo binário conceitual que
virará `.exe` na Wave 3. Botão **Exemplo** traz o programa da referência. A logo institucional aparece no
canto superior esquerdo e pode ser desligada em Projeto → Logo.

**Home:** aba padrão — painel de consulta e auditoria com os marcos do programa,
todos os marcos individuais por componente (com fornecedor e situação), resumo
por fornecedor e achados de auditoria. Tudo derivado do documento, nada
armazenado.

**Interface:** cada painel é dividido em seções recolhíveis, com resumo do
conteúdo no cabeçalho fechado e botões de expandir/recolher tudo. faixa de indicadores no topo (próximo marco, atrasos, avanço),
tooltip e clique direto nas barras do gráfico para abrir a atividade, lista de
validação navegável e temas **claro / escuro / automático** (o
automático segue o sistema e muda junto com ele; `Ctrl+D` alterna). Botão **?**
no cabeçalho lista os atalhos.

**Vários projetos:** o seletor na barra superior troca o projeto ativo sem
perder nada — os projetos ficam todos vivos em memória. `Salvar em…` escolhe a pasta e o
arquivo — aponte para a pasta sincronizada do OneDrive/SharePoint e o time todo
usa o mesmo workspace. Depois disso `Salvar` e `Ctrl+S` gravam sempre ali, e o
botão `Auto` liga o salvamento automático. Se outra pessoa gravar no arquivo
enquanto você trabalha, o app avisa antes de sobrescrever. O `•` na barra indica alterações pendentes; `Ctrl+S` salva.

**Apresentação:** aba com editor de slides — a **capa segue o padrão Stellantis
e é travada** (só o texto e a imagem de fundo mudam). Nas demais: texto, imagens,
formas e tabelas posicionáveis por arrastar, layouts e tema pré-configurados, geração automática
do deck a partir do projeto e exportação `.pptx`.

**Identificação:** o cabeçalho do desenho mostra o rótulo de atualização e o
**responsável** pelo cronograma, ambos editáveis na aba Projeto.

**Legenda:** em Projeto → *Legenda* dá para renomear cada status, trocar as três
cores da barra, ocultar linhas e mudar o título da caixa — com amostra ao vivo e
botão para voltar ao padrão. As chaves internas não mudam, então o arquivo
continua válido.

**Dimensões:** em Projeto → *Dimensões do gráfico* dá para ajustar largura do
mês, altura de linha e barra, painel de componentes, faixa de marcos e escala do
texto — com predefinições Compacto / Padrão / Amplo. O ajuste é gravado no
projeto, então o mesmo arquivo sai igual em qualquer máquina.

**Exportar:** PNG 300 dpi, **PDF vetorial** (sob medida, A3 ou A4 paisagem),
SVG e CSV.

**Ponte com o Excel:** `Excel: colar / copiar` importa e exporta blocos no layout
real das abas `Input Timeline` e `Input Milestone`; `Exportar Excel` gera um
`.xlsx` com essas duas abas mais a aba `Schedule` com o gráfico.

## Estrutura

```
timeline-studio/
├── app/timeline-studio.html         # ★ app funcional — abra no navegador
├── CLAUDE.md                        # contexto persistente + as 7 regras duras
├── contracts/
│   ├── project.schema.json          # ★ contrato congelado — a fonte da verdade
│   ├── workspace.schema.json        # portfólio: N projetos num arquivo .tlsws
│   └── fixture-teste.json           # projeto de exemplo derivado da referência
├── docs/
│   ├── PRD.md                       # problema, escopo, métricas, riscos
│   ├── ADR-001-stack.md             # por que pywebview + React + core Python
│   ├── ADR-002-workspace.md         # por que .tlsws e por que nenhum storage do navegador
│   ├── ADR-003-dimensoes.md         # dimensões por projeto e o bump 1.0 → 1.1
│   ├── ADR-004-home-auditoria.md    # Home derivada, códigos A2xx e o campo fornecedor
│   ├── ADR-005-legenda-editavel.md  # chaves fixas, aparência editável, padrão restaurável
│   ├── ADR-006-apresentacao.md      # deck no documento, PPTX à mão, gerado ≠ vinculado
│   ├── SPEC-001-dominio.md          # modelos, validação E0xx/W1xx, durações
│   ├── SPEC-002-render.md           # display list, tokens visuais, camadas
│   ├── SPEC-003-ui.md               # as duas telas de input + preview
│   ├── SPEC-004-io.md               # .tlsproj, exports, import read-only do .xlsm
│   ├── SPEC-005-packaging.md        # PyInstaller, riscos de antivírus, release
│   ├── SPEC-006-home.md             # painel Home de consulta e auditoria
│   ├── SPEC-007-apresentacao.md     # editor de slides e gerador PPTX
│   ├── PLAN-paralelizacao.md        # waves e protocolo entre agentes
│   └── assets/referencia.png        # saída do gerador legado (fonte visual)
└── .claude/
    ├── agents/                      # 6 subagentes com escopo disjunto
    │   ├── spec-guardian.md         #   guarda contrato, escopo e fronteiras
    │   ├── domain-modeler.md        #   core/domain, core/calc
    │   ├── render-engineer.md       #   core/render
    │   ├── ui-builder.md            #   frontend
    │   ├── io-integrator.md         #   core/io, core/export
    │   └── qa-validator.md          #   tests, audita as SPECs
    └── skills/
        ├── gantt-visual-language/   # linguagem visual do Gantt PHES
        ├── timeline-project-schema/ # contrato, validação e durações
        ├── xlsm-legacy-safety/      # como não destruir um .xlsm com shapes
        └── exe-packaging/           # PyInstaller + frontend estático
```

## Como continuar

1. Responder as **4 perguntas abertas** do `docs/PRD.md` §10 (a nº 4 bloqueia o
   cálculo de semanas).
2. Rodar a Wave 0 do `docs/PLAN-paralelizacao.md` (scaffolding + stubs).
3. Disparar a Wave 1 com os quatro agentes em paralelo.

## Arquitetura em uma frase

`.tlsproj` (JSON) → domínio Pydantic → `LayoutModel` → **um** display list de
primitivas → desenhado tanto pelo `<svg>` do preview quanto pelo exportador
PNG/PDF — por isso o que você vê é exatamente o que sai.
