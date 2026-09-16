# Timeline Studio

Aplicativo offline para criar, revisar e exportar cronogramas de programa
(Gantt + milestones), concebido como sucessor seguro do workbook com macros
`Schedule Generator Tool`.

> **Estado atual:** protótipo funcional v0.3.0 em arquivo HTML único, contrato
> de projeto 1.14 e suíte automatizada com 137 testes. A homologação visual e o
> empacotamento em `.exe` ainda são gates pendentes. Consulte
> [`docs/STATUS-ATUAL.md`](docs/STATUS-ATUAL.md).

## Executar

Abra `app/timeline-studio.html` no Chrome ou Edge. Não há servidor, instalação
ou chamada de rede em runtime.

Para validar o projeto:

```bash
npm install
npm test
```

## Interface atual

A navegação principal e as ações ficam em um único menu superior compacto, com
rolagem horizontal das abas em telas menores:

- **Visão geral:** status executivo, indicadores, prioridades, auditoria e
  Histórico de versões.
- **Apresentação:** editor de slides com capa corporativa Stellantis
  personalizável, geração essencial de capa + cronograma, modelos reutilizáveis
  `.tlstpl` e exportação `.pptx`.
- **OPR:** gera e sincroniza um slide individual para cada componente. Cada
  slide reúne o cronograma filtrado, uma tabela nativa **Next Steps** e, por
  opção, os blocos **Scope** e **Risk/Open Points**. Os slides vivem no mesmo
  deck, saem juntos no `.pptx` e continuam editáveis na Apresentação.
- **Projeto:** identificação, janela do eixo, legenda e dimensões do gráfico.
- **Milestones:** criação e edição dos marcos globais.
- **Timeline:** componentes, atividades e marcadores individuais.

Editor e Preview permanecem lado a lado. O divisor entre eles pode ser
arrastado, ajustado pelo teclado e restaurado com duplo clique; o editor nunca
ultrapassa 50% da área útil. Em telas pequenas, as áreas ficam empilhadas.
Tabelas largas usam rolagem dentro da própria seção, sem desaparecer fora da
janela.

## Recursos implementados

- Preview WYSIWYG com zoom, ajuste total/largura, interação nas barras e modo
  **Tela cheia**.
- Seções recolhíveis com resumo no cabeçalho e controles para expandir ou
  recolher tudo.
- Ocultação reversível de cada componente e milestone, sem excluir dados.
- Legenda configurável por projeto: título, nomes, cores, visibilidade e
  restauração do padrão.
- Dimensões do cronograma configuráveis com predefinições.
- Janela do eixo com os modelos **Ano > Mês** e **Mês > Semana ISO**, incluindo
  rótulos `WeekNN` e largura semanal configurável.
- Tema claro como padrão visual, com modos automático e escuro disponíveis; o
  automático acompanha o sistema.
- Validação navegável; erros bloqueiam exportação e avisos permanecem visíveis.
- Portfólio com vários projetos no mesmo workspace.
- Salvamento manual e automático em `.tlsws`, projeto isolado `.tlsproj` e
  detecção de alteração externa quando a File System Access API está disponível.
- Histórico aditivo das diferenças gerado após salvamentos bem-sucedidos.
- Bancada de apresentação com alinhamento, camadas, clipboard, notas, ordem de
  slides e projeto demonstrativo com capa corporativa e cronograma prontos.
- Exportação PNG, PDF vetorial, SVG, CSV, XLSX e PPTX.

## Arquivos e compatibilidade

`.tlsws` é o formato principal de workspace com vários projetos. Cada projeto
segue `contracts/project.schema.json`; o contrato atual é 1.14.

Os nomes **Input Timeline** e **Input Milestone** continuam existindo apenas na
ponte com o Excel legado. Na interface, as áreas correspondentes se chamam
**Timeline** e **Milestones**.

O `.xlsm` legado é referência e fonte de importação somente leitura. Nunca deve
ser regravado por este projeto.

## Estrutura

```text
timeline-studio/
├── app/timeline-studio.html       # aplicação funcional
├── contracts/
│   ├── project.schema.json        # contrato do projeto, versão 1.14
│   ├── workspace.schema.json      # envelope multiprojeto .tlsws
│   └── fixture-teste.json         # referência automatizada
├── docs/
│   ├── STATUS-ATUAL.md            # implementação, evidências e gates pendentes
│   ├── PRD.md                     # produto, escopo, métricas e riscos
│   ├── ADR-001..015               # decisões arquiteturais
│   ├── SPEC-001..008              # domínio, render, UI, IO, build e módulos
│   ├── CHANGELOG.md               # alterações por versão
│   └── assets/                    # referências e fundo corporativo da capa
├── tests/                         # núcleo, interface e checagem de sintaxe
├── CONTRIBUTING.md
└── CLAUDE.md
```

## Atalhos e interação

- `Ctrl+S`: salvar.
- `Ctrl+D`: alternar tema.
- `Ctrl++`, `Ctrl+-` e `Ctrl+0`: zoom da Preview.
- Divisor com foco: setas ajustam; `Shift` aumenta o passo; `Home`/`End`
  aplicam os limites.
- Duplo clique no divisor: restaura a largura responsiva.
- `Esc`: sai da Preview em tela cheia.

## Próximos gates

1. Homologar visualmente o fluxo completo no ambiente-alvo.
2. Confirmar a paridade do cálculo de semanas com o VBA legado.
3. Validar importação real de variantes anonimizadas do `.xlsm`.
4. Executar o plano de empacotamento e validar o `.exe` em máquina limpa.
5. Medir os requisitos não funcionais da release: inicialização, render,
   tamanho do binário e comportamento do antivírus corporativo.

## Arquitetura atual

O protótipo usa um núcleo JavaScript puro dentro do mesmo HTML para domínio,
validação, display list e exportadores. A interface consome essa mesma display
list no SVG da Preview e nas exportações, reduzindo divergência entre o que o
usuário vê e o que recebe. A arquitetura nativa planejada permanece registrada
em `ADR-001` e `SPEC-005`, mas ainda não deve ser descrita como entregue.
