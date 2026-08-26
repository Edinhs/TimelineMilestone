# SPEC-005 — Build e empacotamento do executável

**Dono:** agente `packaging-engineer`

## 1. Pipeline de build

```
npm --prefix frontend ci && npm --prefix frontend run build   # → frontend/dist
python -m PyInstaller build/timeline-studio.spec              # → dist/timeline-studio.exe
```

`frontend/dist` entra como `datas` no `.spec`; o app resolve o caminho via
`sys._MEIPASS` quando congelado, e via caminho relativo em dev.

## 2. Requisitos do binário

| Item | Alvo |
|------|------|
| Modo | `--onefile --noconsole` (fallback `--onedir` se R1) |
| Tamanho | ≤ 120 MB (NF-04) |
| Cold start | ≤ 4 s (NF-01) |
| Runtime | zero rede (NF-03) — verificado por teste que falha se `socket.connect` for chamado |
| Ícone | `assets/icon.ico` |
| Versão | gravada em `version_info.txt` (produto, versão, empresa) |

## 3. Riscos operacionais

- **Antivírus (R1):** binário PyInstaller `--onefile` é heurística clássica de
  falso positivo. Mitigação: validar cedo com TI; ter `--onedir` + `run.bat`
  pronto; documentar hash SHA-256 de cada release.
- **WebView2:** presente por padrão no Win11 e via Edge no Win10. Se ausente,
  o app deve falhar com mensagem clara e link para o runtime — nunca crashar mudo.

## 4. Exclusões do bundle

Excluir explicitamente `matplotlib`, `pandas`, `scipy`, `tkinter` se não usados.
Auditar com `pyinstaller --log-level=DEBUG` + inspeção do `Analysis`.

## 5. Definição de "release pronta"

- [ ] Todos os testes de SPEC-001..004 verdes
- [ ] Diff visual contra a referência revisado por humano
- [ ] `.exe` roda em máquina limpa sem admin
- [ ] NF-01, NF-02, NF-04 medidos e registrados no `CHANGELOG.md`
- [ ] SHA-256 publicado
