---
name: exe-packaging
description: Empacotar um app Python+web (pywebview/FastAPI + frontend buildado) em executável Windows único com PyInstaller, incluindo assets estáticos, ícone, versão, exclusões e mitigação de falso positivo de antivírus. Use ao configurar build, .spec, CI de release ou ao diagnosticar binário grande, cold start lento ou app que não abre em máquina limpa.
---

# Empacotamento em .exe (PyInstaller + frontend estático)

## Ordem do build
```bash
npm --prefix frontend ci && npm --prefix frontend run build   # → frontend/dist
python -m PyInstaller build/app.spec                          # → dist/app.exe
```
O build do frontend vem **antes**; o `.spec` só embute o que já existe.

## Resolver caminho de assets nos dois modos
```python
import sys, pathlib
BASE = pathlib.Path(getattr(sys, "_MEIPASS", pathlib.Path(__file__).parent))
WEB = BASE / "web"      # frontend/dist copiado para cá via datas=
```
Testar **os dois** caminhos: rodar do fonte e rodar congelado. Bug clássico:
funciona em dev, tela branca no `.exe`.

## Enxugar o binário
- `--onefile --noconsole`, ícone `.ico`, `version_info.txt`.
- `excludes=['matplotlib','pandas','scipy','tkinter']` se não usados — cada um
  custa dezenas de MB.
- Auditar com `--log-level=DEBUG` e inspecionar o objeto `Analysis`.

## Antivírus corporativo
`--onefile` é heurística clássica de falso positivo (o stub se auto-extrai em
temp). Mitigações, em ordem: validar cedo com TI → assinar internamente →
distribuir `--onedir` + `run.bat` → publicar SHA-256 de cada release.

## WebView2 (pywebview no Windows)
Presente por padrão no Win11 e via Edge no Win10. Se ausente, mostrar mensagem
clara com link para o runtime — nunca crashar em silêncio.

## Checklist de release
- [ ] Roda em máquina limpa, sem admin
- [ ] Cold start medido · tamanho do binário medido
- [ ] Zero chamadas de rede em runtime (teste que falha em `socket.connect`)
- [ ] SHA-256 registrado no CHANGELOG
