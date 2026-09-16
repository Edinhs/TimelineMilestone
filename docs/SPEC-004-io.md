# SPEC-004 — Persistência, import e export

**Dono:** agente `io-integrator`

> **Estado de implementação:** o app HTML salva e abre por File System Access
> API quando disponível, com download como fallback. Escrita atômica, backups
> rotativos, importador `.xlsm` via `openpyxl` e a ponte Python pertencem à
> arquitetura-alvo do executável e continuam pendentes; não devem ser tratados
> como capacidades entregues pelo protótipo atual.

## 1. Formatos nativos

### `.tlsproj` — um projeto
JSON UTF-8 idêntico ao `contracts/project.schema.json`, indentado 2 espaços,
chaves em ordem estável. Salvamento atômico: escrever `.tmp` → `os.replace`.
Backup rotativo `.tlsproj.bak` (últimos 3).

### `.tlsws` — workspace com N projetos (portfólio)
Conforme `contracts/workspace.schema.json`. Envelope
`{ ws_version, active, projects:[{ id, doc }] }` onde cada `doc` é um projeto
completo e válido isoladamente. Decisão e alternativas descartadas em
`docs/ADR-002-workspace.md`.

Regras:
- **Trocar de projeto não serializa nada.** O projeto ativo é um ponteiro para
  `projects[i].doc`; edições mutam o objeto no lugar. Alternar não pode
  perder edição pendente — isso é teste obrigatório (§6.5).
- `id` da entrada é estável e independente do nome do programa.
- Abrir um `.tlsproj` solto **adiciona** ao workspace, nunca substitui.
- Abrir um `.tlsws` substitui o workspace inteiro, com confirmação se houver
  alterações pendentes.
- Excluir projeto afeta só a memória; arquivos já salvos permanecem.

### 1b. Destino, salvamento automático e pasta compartilhada

O caso de uso real é uma pasta sincronizada do **OneDrive/SharePoint**. Para o
navegador ela é uma pasta local qualquer; quem publica para o time é o cliente
de sincronização. Isso tem duas consequências que a implementação precisa
encarar:

**O destino é escolhido uma vez.** `Salvar em…` abre o seletor do sistema e
retém o handle. A partir daí, `Salvar` e `Ctrl+S` gravam sempre no mesmo
arquivo, sem perguntar nada. O nome do arquivo e o horário do último
salvamento ficam visíveis na barra.

**O arquivo pode mudar por baixo de nós.** Numa pasta compartilhada, outra
pessoa pode salvar depois de você abrir. Antes de cada gravação o app compara o
`lastModified` do arquivo com o que conhecia; se mudou, pergunta antes de
sobrescrever e nomeia o horário da versão alheia. Sobrescrever calado apagaria
o trabalho de outra pessoa sem deixar rastro. Se o conflito acontecer com o
salvamento automático ligado, ele é **desligado** — repetir a pergunta a cada
dois minutos treinaria o usuário a clicar em "sim" sem ler.

**Salvamento automático** (`Auto`, com intervalo de 1, 2, 5 ou 10 minutos) só
grava quando há alteração pendente e quando existe destino; nunca dispara
download. Estado de sessão, não persistido — mesma razão do tema (regra 6 do
`CLAUDE.md`). Ao fechar a aba com o automático ligado, tenta uma última
gravação.

**Abrir também retém o handle**, então um workspace aberto do OneDrive já nasce
pronto para gravar no lugar.

**Degradação sem a File System Access API** (Firefox, Safari): `Salvar` baixa
uma cópia e a barra mostra `(download)`; `Salvar em…` e `Auto` explicam que
dependem de Chrome ou Edge, em vez de falhar em silêncio.

### Salvamento no app web
`Salvar tudo` grava o `.tlsws`; `Salvar projeto` grava o `.tlsproj` ativo.
Onde houver File System Access API (Chrome/Edge), o handle é retido e os
salvamentos seguintes sobrescrevem o mesmo arquivo; caso contrário, cai para
download. Estado não salvo é sinalizado com `•` na barra e por `beforeunload`.
Atalho `Ctrl+S`. **Nenhum uso de `localStorage`/`sessionStorage`.**

## 2. Export PNG / PDF / SVG

- SVG: serialização direta do display list. Fontes referenciadas por família
  (sem embed) — para arquivo autocontido, usar PNG/PDF.
- PNG: `cairosvg` a 300 dpi (`scale = 300/96`). Fundo branco opaco.
- PDF: **vetorial**, escrito a partir do mesmo display list — não é o PNG
  embrulhado. Texto continua selecionável e o arquivo fica em ~16 KB.
  Três tamanhos de página, margem de 10 mm e rodapé com programa, rótulo de
  atualização e data de geração:
  - `fit` (padrão) — página do tamanho exato do desenho. O gráfico é ≈3,8:1;
    em folha padrão sobraria papel em branco em cima e embaixo. Melhor para
    colar em apresentação.
  - `a3l` / `a4l` — paisagem, conteúdo centrado e escalado para caber.
  - **personalizado** — largura × altura em mm (50–2000), convertidos a
    72/25,4 pt por mm. É escolha do momento da exportação e por isso **não**
    entra no contrato do projeto.

  Fontes: Helvetica e Helvetica-Bold das base-14, **não embutidas** (mantém o
  arquivo pequeno e o texto pesquisável). A centralização usa a tabela AFM de
  larguras, não a aproximação de SPEC-002 §6, para não deslocar rótulo centrado.

  **Desvio consciente da versão anterior desta SPEC:** a quebra em páginas por
  ano ("página n/N") não foi implementada — `fit` resolve o caso de uso real
  (uma folha só, sem corte) e a quebra fica para quando alguém precisar
  imprimir em A4 sem perder legibilidade.
- Nome padrão: `{project.name}_{YYYY-MM-DD}.{ext}`.

## 3. Export XLSX (F-09) — layout legado, três abas

Arquivo **novo** (no app web, OOXML escrito à mão em zip; no core Python,
`openpyxl`). Nunca editando um `.xlsm` existente. As colunas replicam as abas
reais do Schedule Generator Tool para o dado ir e voltar sem tradução:

- **`Input Timeline`** — `Component · Description · Initial Date · Final Date ·
  Status · Status Shape · Milestone Individual · Milestone · Milestone Status ·
  Month · Weeks · System · SSTL`. Título do programa mesclado na linha 1,
  cabeçalho navy com autofiltro na linha 2, linha em branco entre componentes.
  Atividade com mais de um marcador emite linhas extras com `Description = "."`,
  exatamente como o arquivo original.
- **`Input Milestone`** — `Milestone · Type · Initial Date · Final Date · Level ·
  Color Milestone`. `Type` = `Main Milestone` (estilo `gate`) ou `Milestone`
  (estilo `xgate`).
- **`Schedule`** — o Gantt renderizado, embutido como PNG 2× ancorado em A1,
  sem linhas de grade.
- **`Auditoria`** — saída de `auditProgram` (SPEC-006): marcos do programa,
  marcos individuais por componente com fornecedor e situação, resumo por
  fornecedor e a lista de achados `A2xx`. É a aba de consulta que o arquivo
  legado nunca teve.

A coluna `Supplier` é **anexada ao fim** de `Input Timeline`, depois de `SSTL`,
nunca inserida no meio: mover coluna deslocaria o que a macro legada espera. O
importador lê `Supplier` se a coluna existir e ignora se não.

Datas gravadas como datas reais (`numFmt dd/mm/yyyy`); `Month`, `Weeks`, `Level`
e `Color` como números. Nenhuma célula contém fórmula.

Durações são gravadas como **valores estáticos**, nunca fórmulas. Motivo
documentado: o arquivo legado tinha fórmula auto-referenciada em `Final Date`
(P4 do PRD) e `calcPr` sem `iterate="1"`.

## 4. Import do `.xlsm` legado (F-10)

**Regra absoluta: somente leitura. O `.xlsm` original nunca é aberto em modo
de escrita, nem por openpyxl nem por LibreOffice.** Motivo: `keep_vba=True`
destrói ~99% do DrawingML (verificado: `drawingN.xml` 413.685 B → 1.383 B) e
o LibreOffice falha ao re-salvar após tocar a biblioteca VBA.

Procedimento:
1. Copiar o arquivo para um caminho temporário descartável.
2. `openpyxl.load_workbook(tmp, data_only=True, read_only=True)` — sem salvar.
3. Ler as abas `Input Milestone` e `InputTimeline` por **nome de cabeçalho**,
   não por índice de coluna.
4. Mapear status por cor/rótulo quando existir; senão `ontime` + aviso.
5. Produzir um relatório: linhas importadas, linhas ignoradas e por quê.
6. Nunca falhar em silêncio; nunca inventar data ausente — linha vira `Issue`.

## 3b. Export PPTX

Apresentação do projeto, especificada em `docs/SPEC-007-apresentacao.md`.
Mesmo princípio do XLSX: OOXML montado à mão em zip, sem biblioteca, sem CDN.

## 4b. Status com rótulo personalizado

A coluna `Status` é exportada com o **rótulo do projeto**. Na volta, o
importador resolve na ordem: rótulos do projeto atual → tabela de sinônimos
padrão (inglês e português) → `ontime`. Sem isso, um bloco exportado com
"No prazo" voltaria como `ontime` por acidente e "Ponto de atenção" se perderia.

## 5. Import CSV / colar do Excel

Mesmo mapeador por cabeçalho, alimentado por texto TSV vindo do clipboard.
Datas aceitas: `YYYY-MM-DD`, `DD/MM/YYYY`, serial Excel.

## 6. Testes obrigatórios

1. Round-trip `.tlsproj`: carregar → salvar → byte-idêntico.
5. Round-trip `.tlsws` com ≥3 projetos: byte-idêntico, `active` preservado.
6. **Troca de projeto sem perda:** editar A → trocar para B → editar B → voltar
   para A → o estado de A é exatamente o que foi deixado, inclusive edição não
   confirmada por blur.
7. Abrir `.tlsproj` com workspace populado adiciona uma entrada e mantém as demais.
2. Export XLSX abre sem erro e `recalc` retorna zero erros de fórmula.
2b. PDF: `qpdf --check` sem erro de sintaxe nos três tamanhos; `MediaBox`
   correto; texto extraível contendo o nome do programa; render em imagem
   conferido contra o PNG.
3. Import de um `.xlsm` de amostra **anonimizado** produz um `Project` válido.
4. Após qualquer import, o arquivo fonte é byte-idêntico ao original (`cmp -s`).
