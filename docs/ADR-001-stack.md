# ADR-001 — Stack e formato de empacotamento

**Status:** proposto · **Data:** 2026-08-24 · **Decisor:** Ederson

## Contexto

Precisamos de um app *executável* (§F-11 do PRD) que rode em máquina
corporativa Windows sem instalação nem direitos de admin, renderize um Gantt
denso com alta fidelidade tipográfica, e reaproveite a stack que o time já
domina (Python/FastAPI, React/Vite).

## Opções consideradas

| Opção | Prós | Contras |
|-------|------|---------|
| **A. Python + PySide6 + QGraphicsScene** | Nativo, binário menor, sem WebView | Reescrever todo o desenho em Qt; tipografia densa e export SVG mais trabalhosos; time não domina Qt |
| **B. Electron + React** | Melhor DX de UI | Binário 200+ MB (fura NF-04), Node no runtime, mais atrito com TI |
| **C. Tauri + React** | Binário pequeno, WebView2 nativo | Exige toolchain Rust; core de cálculo em Python teria que virar sidecar |
| **D. pywebview + React (build estático) + core Python** | Reusa Python **e** React; WebView2 já existe no Win10/11; SVG dá fidelidade e export trivial; PyInstaller gera 1 arquivo | WebView2 precisa estar presente (é, por padrão, no Win11 e via Edge no Win10) |

## Decisão

**Opção D.**

- **UI:** React 18 + Vite, buildado para assets estáticos embutidos no binário.
- **Shell:** `pywebview` (WebView2 no Windows) → janela nativa, sem browser externo.
- **Ponte:** `pywebview` JS API (síncrona, sem porta TCP aberta). FastAPI local
  fica como *fallback* de desenvolvimento (`--dev` sobe `uvicorn` em 127.0.0.1).
- **Core:** Python 3.11, Pydantic v2 para o domínio (espelho 1:1 do JSON Schema).
- **Render:** **uma única engine de layout em Python** produz um *display list*
  (lista de primitivas: rect, line, text, polygon). O React desenha esse display
  list em `<svg>` no preview; o exportador Python desenha o **mesmo** display
  list em SVG canônico → PNG (`cairosvg`) / PDF. Isso elimina a divergência
  clássica "preview ≠ export".
- **Empacotamento:** PyInstaller `--onefile`; fallback `--onedir` + `.bat` se R1 se materializar.

## Consequências

- O layout precisa ser **puro e determinístico** em Python (sem depender do DOM
  para medir texto → usar tabela de larguras de fonte aproximada, ver SPEC-002 §6).
- O frontend não pode conter regra de negócio: só apresentação e edição de formulário.
- Testar o core é fácil (sem UI): fixture JSON → display list → snapshot.
- Trocar a UI depois (Qt, web) custa pouco, porque a engine é headless.

## Alternativa descartada explicitamente

Continuar dentro do `.xlsm` estendendo o VBA. Descartado por P1/P2 do PRD:
neste ambiente não há forma automatizável e verificável de editar o VBA e as
shapes com segurança (openpyxl destrói DrawingML; LibreOffice falha ao re-salvar
após tocar a biblioteca VBA). Toda leitura do arquivo legado será **read-only**.
