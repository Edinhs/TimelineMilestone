# SPEC-003 — UI: telas de input, indicadores e interação

## 0. Direção visual

**Dashboard corporativo.** O entregável continua sendo a folha branca do
cronograma, mas a aplicação organiza o trabalho como um painel executivo:
navegação superior compacta, cabeçalho claro, contexto do programa, KPIs e
superfícies brancas com elevação discreta. Azul institucional identifica ação,
foco e seleção. Vermelho, âmbar e verde ficam reservados a estado.

No desktop, o menu superior reúne identidade, navegação, seleção de projeto e
ações em uma única faixa. Em telas menores, as abas mantêm rolagem horizontal
dentro do mesmo cabeçalho.

### Dois temas, um sistema

`:root` define o tema claro; `[data-theme="dark"]` redefine **os mesmos nomes**.
Nenhuma regra de componente conhece cor literal. As únicas exceções são texto
branco sobre preenchimento colorido (`#fff` em botão primário e etiquetas de
código), a folha do cronograma e a paleta do desenho — que é do documento, não
da interface.

| grupo | tokens |
|---|---|
| superfície | `--bg` mesa · `--surface` painel · `--surface-2/3` variações · `--line`, `--line-2` |
| tinta | `--txt` · `--txt-2` secundário · `--txt-3` rótulo |
| ação | `--navy` superfície de ação · `--accent` tinta de ação · `--navy-tint` foco · `--navy-soft` seleção |
| estado | `--ok` · `--warn` · `--err` |
| cabeçalho | `--mh-bg`, `--mh-bg-2`, `--mh-line`, `--mh-fg`, `--mh-fg-2/3`, `--mh-hover`, `--mh-border`, `--mh-input`, `--mh-focus`, `--mh-shadow` |
| flutuantes | `--float-bg`, `--float-fg`, `--float-fg-2`, `--scrim`, `--shadow-1/2`, `--paper-ring` |

**Superfície de ação ≠ tinta de ação.** No claro os dois são o mesmo navy. No
escuro não podem ser: o azul que aguenta texto branco em cima (`--navy #3A54C4`)
é escuro demais para ser lido como texto sobre o fundo, e o azul legível como
texto (`--accent #8FA6F2`) é claro demais para carregar texto branco. Botão
primário usa `--navy`; borda de foco, aba ativa e hover usam `--accent`.

**Modos:** claro (padrão), escuro e automático, alternados pelo botão de ícone
no cabeçalho ou por `Ctrl+D`. O ícone mostra o **modo escolhido**, não o
resultado: disco meio preenchido em automático (quem manda é o sistema), sol em
claro, lua em escuro. Mostrar o resultado esconderia justamente a informação que
o usuário controla. O `title`/`aria-label` completa — em automático diz também
qual tema está valendo agora.

Ícones são SVG inline com `stroke: currentColor`, então herdam a cor do botão em
qualquer tema e não custam requisição nem arquivo. Botão de ajuda idem. O automático segue `prefers-color-scheme` e reage em
tempo real via `matchMedia().addEventListener("change")` — se o Windows virar
para o tema noturno agendado, a aplicação acompanha sem recarregar. **Não há
persistência entre sessões**: guardar exigiria storage de navegador, proibido
pela regra 6 do `CLAUDE.md`.

`color-scheme: light|dark` é declarado em cada tema. Sem isso, os controles
nativos — seletor de data, spinners numéricos, barras de rolagem — continuariam
claros dentro da interface escura, que é o defeito mais comum de dark mode
improvisado.

**A folha permanece branca nos dois modos.** Ela é literalmente o que sai no
PDF, no PNG e na aba Schedule do Excel; escurecê-la quebraria o WYSIWYG. No tema
escuro ela ganha um anel sutil (`--paper-ring`) para não flutuar sem borda.

### Contraste verificado (WCAG 2.1)

Medido par a par nos dois temas. Todos os pares de texto atingem no mínimo AA
(4,5:1); os rótulos micro em caixa-alta foram escurecidos/clareados até passar
— `--txt-3` ficou em 5,02:1 no claro e 5,52:1 no escuro, não nos 3,3:1 do
primeiro rascunho.

O cabeçalho foi medido separadamente depois de passar a seguir o tema (fundo
`#FFFFFF` / faixa 2 `#F3F6FB` no claro; `#12171F` / `#181E28` no escuro): pior
par em cada tema é o rótulo micro, com 4,64:1 e 5,29:1 — ambos AA.

**Tipografia.** Interface em stack de sistema (`Segoe UI` primeiro — o ambiente
alvo é Windows corporativo; nenhuma webfont, o app é offline). Regra dura:
**todo numeral da interface é monoespaçado tabular** — datas, durações,
dimensões, contadores, zoom. Cronograma é número; número que dança entre
frames atrapalha comparação visual. Rótulos de seção são caixa-alta 9,5 px com
`letter-spacing: .14em` e uma régua fina à direita, para separar sem pesar.

## 1c. Seções recolhíveis

Cada painel é dividido em seções `<details>` — uma aberta por vez ao chegar, as
demais recolhidas, com "Expandir tudo / Recolher tudo" no topo. O estado vive na
sessão e sobrevive à troca de aba; não persiste entre execuções, porque isso
exigiria storage de navegador (regra 6 do `CLAUDE.md`).

**Fechado não pode significar invisível.** Cada cabeçalho mostra à direita um
resumo do que a seção contém — `TESTE · E. Fernandes`, `01/05/2025 → 28/02/2029`,
`Components · 5 de 5`, `1296 × 348 px`, `2 sem fornecedor`. Sem isso, o usuário
teria que abrir cada seção só para lembrar o que há dentro, e o acordeão viraria
obstáculo em vez de organização.

**Implementação:** o HTML já pronto do painel é fatiado nos `<h3>` e cada pedaço
é embrulhado num `<details>` (`sectionize`). Nenhum painel foi reescrito, e
qualquer painel novo ganha o comportamento só por usar `<h3>`. `<details>`
nativo entrega navegação por teclado e semântica de leitor de tela sem código.
O evento `toggle` não sobe na árvore, então o registro do estado escuta em fase
de captura.

Conteúdo largo nunca é cortado pelo acordeão. O painel mantém apenas rolagem
vertical, enquanto cada `.sec-b` assume a rolagem horizontal do próprio
conteúdo. Tabelas preservam a largura necessária às colunas e campos flexíveis
podem encolher até a largura disponível. Assim, em painéis estreitos, nenhuma
coluna ou ação desaparece fora da janela e a rolagem fica junto da seção a que
pertence.

## 1. Layout da aplicação

**Dono:** `ui-builder` · **Depende de:** contrato JSON + display list (SPEC-002)

Assinatura da Visão geral: a **faixa de indicadores** entre o cabeçalho e o desenho.
Ela é ocultada nas demais seções para manter o contexto de edição mais compacto.
Ela transforma o editor em briefing e é derivada, nunca armazenada
(`computeKPIs`):

| indicador | conteúdo | ao clicar |
|---|---|---|
| Próximo marco | rótulo, data e semanas até lá, a partir de `today` | vai para Milestones |
| Em atraso | atividades `delayed` + `concluded_delay` | abre a primeira delas |
| Concluídas | `n/total` e % do escopo | — |
| Componentes | contagem, com total de atividades | vai para Timeline |
| Janela | intervalo de anos e nº de meses | vai para Projeto |

"Próximo marco" é o primeiro item porque é a pergunta que o PL faz todo dia.

```
┌───────────────────────────────────────────────────────────┐
│ toolbar: [Novo] [Abrir] [Salvar] │ [PNG] [PDF] [SVG] [XLSX]│
├───────────────────────────────────────────────────────────┤
│ Visão geral · Apresentação · Projeto · Milestones · Timeline│
├───────────────┬───────────────────────────────────────────┤
│ editor        │            PREVIEW  (<svg>)               │
│ da seção      │            zoom / fit / pan               │
│ ativa         │                                           │
├───────────────┴───────────────────────────────────────────┤
│ painel de validação: 0 erros · 2 avisos   [clicável]      │
└───────────────────────────────────────────────────────────┘
```

A navegação principal e as ações do workspace ocupam um único menu superior de
58 px no desktop. As abas são compactas e têm rolagem horizontal própria quando
o espaço diminui, preservando o acesso a todas as seções sem criar uma segunda
barra. Editor e Preview permanecem lado a lado enquanto houver largura; o
Preview é o mesmo desenho que sai no export.

Um divisor vertical entre editor e Preview permite personalizar a largura do
editor durante a sessão. O limite superior é **50% da área útil depois de
descontar o divisor**, preservando metade do workspace
restante para a Preview; o mínimo é 280 px enquanto houver espaço.
O divisor aceita arraste, setas do teclado (com `Shift` para passos maiores),
`Home`/`End` para os limites e duplo clique para restaurar o tamanho responsivo.
Em telas de até 760 px, onde as áreas ficam empilhadas, o divisor é ocultado.

### Modelos da janela do eixo

Na aba **Projeto**, a seção **Janela do eixo** contém o seletor **Modelo do
eixo** com exatamente duas opções:

- **Ano > Mês**: comportamento histórico e padrão para projetos antigos.
- **Mês > Semana ISO (Week31)**: agrupa semanas pelo mês/ano e mostra `WeekNN`.

A troca atualiza a Preview sem remontar o formulário, preserva o foco e é salva
em `project.axis_mode`. O controle de dimensões oferece separadamente a largura
do mês e a largura da semana.

### Tela cheia da Preview

A barra da Preview oferece a ação **Tela cheia**. O mesmo controle encerra o
modo, e a tecla `Esc` permanece disponível pelo comportamento nativo do
navegador. A área ampliada inclui zoom, desenho e painel de validação.

### Edição direta no palco

Elementos de texto dos slides expõem um campo editável no próprio palco. Clique
posiciona o cursor; um deslocamento superior a 4 px troca o gesto para arraste.
Enquanto o cursor está no texto, setas, `Backspace` e `Delete` editam o conteúdo
e não movem nem removem o elemento. `Escape` encerra a edição; `Enter` confirma
cabeçalhos de uma linha e continua criando linhas nos corpos do OPR.

## 1d. Histórico dentro da Visão geral

A Visão geral possui as subabas **Resumo** e **Histórico de versões**. O
histórico lista as versões mais recentes primeiro e abre a versão atual por
padrão. Cada versão apresenta data/hora, campo, ação e valores anterior/posterior.
Quando ainda não houve salvamento com mudanças, a tela explica quando a primeira
versão será criada.

## 2. Aba Milestones

`Input Milestone` permanece somente como nome da aba compatível no XLSX legado.

Grid editável, uma linha por marco:

| Coluna | Editor | Validação |
|--------|--------|-----------|
| ID | texto (slug) | único, `^[A-Za-z0-9_-]{1,24}$` |
| Label | texto ≤16 | — |
| Data | date picker | dentro da janela do eixo → senão `W103` |
| Estilo | select `gate` / `xgate` / `custom` | — |
| Linha vertical | checkbox | — |
| Marcador | checkbox | — |
| Cor | color picker | só habilitado com `custom` |

Ações: adicionar, duplicar, remover, reordenar por data. Botão "Preencher
padrão PHES" insere PM, CM, SFM, SHRM, SOPM, X0–X3 sem datas.

Cada milestone possui uma ação de visibilidade. Ocultar remove apenas sua
representação do cronograma; a linha, seus dados e sua possibilidade de edição
continuam presentes (ADR-007).

## 2b. Aba Visão geral

Aba padrão, especificada em `docs/SPEC-006-home.md`. Painel de consulta e
auditoria, derivado do documento e somente leitura — exceto o campo de
fornecedor, editável no lugar.

## 3. Aba Timeline

`Input Timeline` permanece somente como nome da aba compatível no XLSX legado.

Duas seções: **Componentes** (mestre) e **Atividades** (detalhe do componente selecionado).

Componentes: `nome`, `grupo`, `ordem`, `fornecedor`, `[+ atividade]`,
`[ocultar/exibir]`, `[remover]`. Ocultar é reversível, preserva atividades e
afeta somente os exports visuais (ADR-007).
O fornecedor também é editável direto na Visão geral — a informação costuma chegar
enquanto se consulta, e obrigar a trocar de aba para registrá-la faz com que
não seja registrada.

Atividades:

| Coluna | Editor | Nota |
|--------|--------|------|
| Nome | texto ≤60 | ex.: `SW Development` |
| Início / Fim | date picker | `E001` |
| Duração | **read-only, calculada** | `56W` — nunca editável, evita o bug P4 |
| Status | select com *chip* colorido | usa a paleta de SPEC-002 |
| Lane | number + botão "auto" | `E005` |
| Rótulo | select inside/above/right | — |
| Marcadores | editor próprio: uma pastilha por marcador com rótulo, data, centralizar e remover | `W102` |

**Marcador novo nasce centralizado na atividade.** É a única posição que nunca
cai fora da barra e não inventa um prazo que ninguém informou — encostar no
início sugeriria que o evento acontece na largada. O botão `↹` recentraliza um
marcador já existente. Vale também para importação: linha do Excel com
`Milestone Individual` preenchido e `Milestone` vazio entra no meio da barra,
em vez de ser descartada.

A data fora do intervalo da atividade fica com a borda vermelha na hora, além do
aviso `W102` no painel de validação.

O formato de texto `rótulo@AAAA-MM-DD` foi **removido da interface** — sobrevive
só na exportação e na leitura de blocos do Excel, onde uma célula precisa mesmo
caber numa string. Como campo de formulário ele obrigava o usuário a acertar
sintaxe para registrar duas informações que merecem dois controles.

Colar do Excel (Ctrl+V de um bloco tabular) deve preencher múltiplas linhas —
é o caminho de migração mais provável dos dados atuais.

## 2c. Identificação (aba Projeto)

Ao lado de *Rótulo de atualização*, o campo **Responsável** (`project.owner`).
Os dois alimentam o bloco de identificação do desenho (SPEC-002 §6a) e a Visão geral.

## 3b. Legenda editável (aba Projeto)

Seção "Legenda (Components)": título da caixa, casa de "ocultar legenda", e uma
linha por status com nome, três seletores de cor (preenchimento, contorno,
texto) e casa de "mostrar na legenda". Cada linha exibe uma **amostra ao vivo da
barra**, com o rótulo desenhado por cima nas cores escolhidas — é o único jeito
de o usuário enxergar um par cor/texto ilegível antes de exportar.

Botão **Restaurar padrão** remove `project.legend` inteiro (ADR-005), não grava
os valores padrão. A UI deve deixar claro que a ação zera todas as cinco linhas
e o título de uma vez.

O rótulo personalizado aparece em **todo lugar** que hoje mostra o rótulo
padrão: seletor de status da grid, tooltip do gráfico, coluna `Status` do Excel
e do CSV. Renomear e continuar vendo o nome antigo em metade da interface é pior
que não poder renomear.

## 4. Feedback de validação

- Célula com erro: borda vermelha + tooltip com o código (`E005`).
- Aviso: borda âmbar.
- Painel inferior lista todos os `Issue`; clicar navega até a célula.
- Export bloqueado com qualquer `error`; permitido com `warning`.

## 4b. Interação com o desenho

O preview não é uma imagem morta:

- **Hover numa barra** → tooltip com atividade, datas, duração, componente,
  status e marcadores.
- **Clique numa barra** → abre a atividade correspondente: troca para a aba
  Timeline, seleciona o componente, rola até a linha, destaca e foca o
  campo. É o caminho mais curto entre "vi algo errado" e "corrigi".
- **Clique num item da validação** → mesma navegação, a partir do `Issue.path`.

Para isso, as primitivas de barra carregam `id`, que o serializador SVG emite
como `data-aid`. PDF, PNG e XLSX ignoram o atributo — a interatividade não
contamina o export.

## 4c. Retorno ao usuário

`alert()` foi eliminado dos fluxos normais; confirmações e falhas aparecem como
**toast** no canto inferior direito (verde/âmbar/vermelho na borda esquerda).
`confirm()` permanece apenas onde há risco real de perda (descartar workspace,
excluir projeto) — ali a interrupção é o ponto.

## 4d. Verificação em DOM real

Checagem de sintaxe não pega erro de execução: uma variável não declarada só
estoura quando a função roda. O arquivo `tests/test-ui.mjs` carrega o app em
jsdom (com `ResizeObserver` e métricas de layout stubadas), captura
`window.onerror` e exerce o caminho crítico — boot, cada botão de zoom, troca de
aba, montagem do palco, travas da capa e arraste. Qualquer exceção aparece como
erro, não como botão que "não faz nada".

Foi assim que se encontrou o `viewDims is not defined` que matava o zoom por
inteiro: `node --check` passava, e o defeito só existia em tempo de execução.

## 4e. Nunca remontar o painel enquanto o usuário digita

`render()` reconstrói o painel por `innerHTML`, o que **destrói o campo que tem
o foco**. Num campo de texto isso significa perder o cursor a cada tecla — o
usuário digita uma letra e precisa clicar de novo.

Regra: handler de `input` só pode chamar `touch()` (que redesenha o gráfico e a
validação, não o painel). Quando algo no painel precisa refletir a mudança, ele
é atualizado **no lugar**:

| campo | atualização no lugar |
|---|---|
| nome exibido do status | `updateLegendSample(k)` — texto e as três cores da amostra |
| cores do status | mesma função |
| nome do componente | texto do item na lista |
| título do slide | texto do item na lista de slides |
| data do marcador | alterna a classe `bad` e o `title` do próprio campo |

`render()` continua correto para mudanças **estruturais** disparadas por clique
ou por `select`: trocar de aba, de slide, de layout, adicionar ou remover item.
Ali não há campo de texto em edição para proteger.

## 5. Regras de estado (implementação atual)

- O workspace mantém todos os projetos vivos em memória; `P` aponta para o
  documento ativo e as edições atualizam esse objeto.
- `touch()` marca alterações e redesenha Preview/validação sem remontar os
  campos; `render()` completo fica reservado a mudanças estruturais.
- O histórico compara o estado salvo conhecido com o estado gravado e só cria
  versão depois de uma escrita bem-sucedida (ADR-008).
- Undo/redo ainda não está implementado e permanece no roadmap v1.1.
- **Proibido:** `localStorage`/`sessionStorage`. Persistência ocorre somente em
  arquivo escolhido pelo usuário ou download de fallback.

## 6. Acessibilidade e ergonomia

- Navegação por teclado completa nas grids (Tab, Enter, setas, Ctrl+D duplicar).
- Chips de status não dependem só de cor: exibem o rótulo textual.
- Zoom do preview: roda do mouse, botões `−`/`+`, `Tudo`, `Largura`, `100%` e
  atalhos `Ctrl++`, `Ctrl+-`, `Ctrl+0`.
- O divisor editor/Preview usa `role="separator"`, recebe foco e aceita setas,
  `Shift`, `Home` e `End`; o valor acessível é informado como percentual.
