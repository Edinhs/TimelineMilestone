# CLAUDE.md — Timeline Studio

Contexto persistente para qualquer sessão de Claude Code neste repositório.
**Leia isto antes de escrever qualquer linha de código.**

## O que estamos construindo

Um **executável Windows único, offline**, que substitui o workbook macro
`Schedule Generator Tool v09` (.xlsm) do time PHES. Duas telas de entrada —
**Input Milestone** e **Input Timeline** — alimentam uma engine que desenha um
Gantt de programa idêntico em espírito à referência
(`docs/assets/referencia.png`) e exporta PNG/PDF/SVG/XLSX.

Documentos normativos, em ordem de precedência:
`contracts/project.schema.json` → `contracts/workspace.schema.json` →
`docs/PRD.md` → `docs/ADR-001-stack.md`, `docs/ADR-002-workspace.md`,
`docs/ADR-003-dimensoes.md`, `docs/ADR-004-home-auditoria.md`,
`docs/ADR-005-legenda-editavel.md`, `docs/ADR-006-apresentacao.md` →
`docs/SPEC-001..007` → este arquivo.

## Estado atual

**Wave 1 parcial.** Contrato e SPECs congelados. Existe um app web funcional em
`app/timeline-studio.html` (arquivo único, sem dependências) que já implementa
domínio, validação, render, portfólio multiprojeto e interoperabilidade com o
Excel. O core Python das SPECs 001–005 ainda não foi escrito — o app web é a
prova de conceito executável dessas regras.

## Stack (ADR-001)

Python 3.11 + Pydantic v2 (core headless) · pywebview/WebView2 (shell) ·
React 18 + Vite (UI) · SVG (render) · cairosvg (PNG/PDF) · openpyxl (XLSX) ·
PyInstaller (build).

## Fronteiras de propriedade — não cruze

| Pasta | Agente dono | SPEC |
|---|---|---|
| `contracts/` | `spec-guardian` | — |
| `core/domain/`, `core/calc/` | `domain-modeler` | SPEC-001 |
| `core/render/` | `render-engineer` | SPEC-002 |
| `frontend/` | `ui-builder` | SPEC-003 |
| `core/io/`, `core/export/` | `io-integrator` | SPEC-004 |
| `build/`, `.spec`, CI | `packaging-engineer` | SPEC-005 |
| `tests/` | `qa-validator` | todas |

Home e auditoria: `auditProgram` é do `domain-modeler` (SPEC-006 §2), a tela é
do `ui-builder` (SPEC-006 §3).

## As sete regras duras

1. **O contrato é congelado.** Campo novo em `project.schema.json` exige bump de
   `schema_version`, plano de migração e aprovação do usuário. Nunca edite de improviso.
   Estado atual: **1.4** (1.1 `project.layout` — ADR-003; 1.2
   `components[].supplier` — ADR-004; 1.3 `project.legend` — ADR-005;
   1.4 `project.owner`; 1.5 `project.deck`; 1.6 `role`/`locked` em elementos
   de slide — ADR-006). Todos
   aditivos: documentos anteriores continuam válidos e o carregador promove sem
   transformar nada. As **chaves** do enum de status são intocáveis; só a
   aparência delas é editável.
2. **Uma engine, dois consumidores.** Preview e export desenham o **mesmo**
   display list. Nunca crie um segundo caminho de desenho.
3. **Zero regra de negócio no frontend.** Duração, validação, posição e cor vêm
   do core. O React só desenha primitivas e edita formulários.
4. **O `.xlsm` legado é somente leitura.** Nunca abrir em modo escrita.
   openpyxl com `keep_vba=True` destrói ~99% do DrawingML (413.685 B → 1.383 B);
   LibreOffice falha ao re-salvar após tocar VBA e remove os controles ActiveX.
5. **Duração é derivada, nunca armazenada nem digitada.** O arquivo legado tinha
   fórmula auto-referenciada em `Final Date` — esse bug não pode renascer aqui.
6. **Sem `localStorage`/`sessionStorage`** e sem rede em runtime. Persistência
   só via arquivo escolhido pelo usuário (`.tlsproj` ou `.tlsws`). Ver ADR-002.
   Corolário: salvar é explícito, então alteração pendente **precisa** ser
   sinalizada (`•`, `beforeunload`, `Ctrl+S`).
7. **Nenhum dado real de programa no repositório.** Só fixtures anônimas.
8. **Nada derivado é armazenado.** Exceção explícita e única: o deck da aba
   Apresentação é **autoria** do usuário, não relatório — o que ele escreveu num
   slide é dado dele. Por isso os slides gerados não se auto-atualizam
   (ADR-006 §2). O elemento `chart` continua derivado: guarda posição, nunca a
   imagem. Contagens, prazos, situações e achados de
   auditoria são calculados na hora. Dado derivado que persiste desatualiza em
   silêncio — foi assim que a aba `Projetos` do arquivo legado apodreceu.
9. **Restaurar padrão apaga a sobrescrita, não copia o padrão para dentro dela.**
   Documento sem opinião acompanha correções futuras; documento com a paleta
   copiada congela a versão de hoje.
10. **Trocar de projeto é trocar de ponteiro.** O projeto ativo referencia
   `WS.projects[i].doc` diretamente; nunca copie o documento para editar e
   escreva de volta depois — é assim que se perde o trabalho do usuário.

## Perguntas abertas (bloqueantes — não "resolva" sozinho)

1. `.exe` offline ou app web interno? (assumido: `.exe`)
2. O XLSX exportado precisa ser consumível pela macro legada?
3. Janela do eixo manual ou inferida do min/max das datas?
4. Semana = corrida ou ISO? Arredondamento? — bloqueia `weeks()` em SPEC-001 §3.

## Comandos

```bash
node --check <(sed -n '/<script>/,/<\/script>/p' app/timeline-studio.html)   # sintaxe
node app/smoke-check.js         # app real em jsdom: boot, zoom, abas, palco
pytest -q                       # suíte do core
python -m app --dev             # roda com FastAPI local + Vite dev server
npm --prefix frontend run dev   # UI isolada com fixture
python -m PyInstaller build/timeline-studio.spec
```

## Convenções

- Commits referenciam o requisito: `feat(render): barras por status (F-04, SPEC-002 §3)`.
- Datas sempre ISO `YYYY-MM-DD`. Timezone irrelevante — trabalhamos com `date`, não `datetime`.
- Português nos docs e mensagens de UI; inglês nos identificadores de código.
- Nada de número mágico em código de desenho: tudo em `core/render/theme.py`.
- **Toda substituição de texto em patch precisa falhar alto se não bater.** Um
  `replace` que não encontra o alvo não avisa nada e deixa o arquivo pela
  metade — foi assim que `renderPreview` ficou sem `viewDims` e o zoom morreu.
  Depois de mexer no app, rode `node app/smoke-check.js`.
- **Handler de `input` nunca chama `render()`.** Remontar o painel destrói o
  campo em foco e o usuário perde o cursor a cada tecla. Use `touch()` e
  atualize o que precisa no lugar (SPEC-003 §4e).
