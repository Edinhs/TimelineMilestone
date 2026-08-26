# Plano de execução — waves paralelas

## Por que dá para paralelizar

Porque o **contrato vem antes do código**. `contracts/project.schema.json` é
congelado na Wave 0; a partir dele, quatro agentes trabalham em pastas
disjuntas contra interfaces conhecidas, sem se bloquearem:

```
                    contracts/project.schema.json  (congelado)
                                   │
        ┌──────────────┬───────────┴───────────┬──────────────┐
        ▼              ▼                       ▼              ▼
  domain-modeler  render-engineer          ui-builder     io-integrator
  core/domain/    core/render/             frontend/      core/io/
  core/calc/      core/export? não → io    (só desenha)   core/export/
```

Regra que sustenta tudo: **um arquivo tem exatamente um agente dono.** Se dois
precisam do mesmo arquivo, a fronteira está errada — chame o `spec-guardian`.

## Wave 0 — Fundação (sequencial, ~1 sessão)

| Passo | Dono | Saída |
|---|---|---|
| Congelar contrato | `spec-guardian` | `project.schema.json` v1.0 ✅ |
| Fixture de referência | `spec-guardian` | `fixture-teste.json` ✅ |
| Stubs de interface | `domain-modeler` | `LayoutModel`, `Issue`, `Primitive` como dataclasses vazias mas tipadas |
| Scaffolding | `packaging-engineer` | árvore de pastas, `pyproject.toml`, `frontend/` vazio, CI |

**Gate de saída:** os stubs importam e os testes rodam (todos vermelhos, mas rodam).
Sem isso, paralelizar produz merge hell.

## Wave 1 — Núcleo (4 agentes em paralelo)

| Agente | Entrega | Consome | Produz |
|---|---|---|---|
| `domain-modeler` | SPEC-001 | JSON Schema | `LayoutModel`, `Issue[]` |
| `render-engineer` | SPEC-002 | `LayoutModel` **stub** | `Primitive[]` |
| `ui-builder` | SPEC-003 | `Primitive[]` **stub** + fixture | telas + preview |
| `io-integrator` | SPEC-004 | JSON Schema | `.tlsproj`, PNG/PDF/SVG/XLSX |

Cada um trabalha contra o *stub* do vizinho, não contra a implementação real.
Ninguém espera ninguém.

**Gate de saída (`qa-validator`):** `fixture-teste.json` → domínio → layout →
display list → SVG → PNG, ponta a ponta, com o preview da UI mostrando o mesmo
desenho.

## Wave 2 — Integração e fidelidade (parcialmente paralelo)

- `render-engineer` + `qa-validator`: ciclo de diff visual contra
  `docs/assets/referencia.png` até aprovação humana.
- `io-integrator`: importador do `.xlsm` legado (precisa de um arquivo de
  amostra **anonimizado** — dependência externa, do usuário).
- `ui-builder`: colar do Excel, undo/redo, atalhos de teclado.
- `domain-modeler`: fechar a paridade de `weeks()` (bloqueado por PRD §10.4).

## Wave 3 — Empacotamento (sequencial)

`packaging-engineer` → `.exe`, medições NF-01/02/04, teste em máquina limpa,
SHA-256, CHANGELOG. `qa-validator` valida o checklist de release (SPEC-005 §5).

## Como disparar no Claude Code

```
# Wave 1 — em uma única mensagem, para rodarem concorrentemente:
Rode em paralelo: use o subagente domain-modeler para implementar SPEC-001,
o render-engineer para SPEC-002, o ui-builder para SPEC-003 e o io-integrator
para SPEC-004. Cada um trabalha só na sua pasta e contra os stubs da Wave 0.
```

Depois de cada wave: `use o qa-validator para auditar a wave contra as SPECs`.

## Protocolo de conflito

1. Agente encontra necessidade fora do seu escopo → **não implementa**, abre
   nota para o `spec-guardian`.
2. `spec-guardian` decide: (a) ajuste de SPEC, (b) nova interface, ou
   (c) escalar ao usuário se for mudança de contrato ou de escopo do PRD.
3. Mudança de contrato ⇒ bump de `schema_version` + plano de migração + ADR.

## Regras de higiene

- Um commit por entrega lógica, com o ID do requisito na mensagem (`F-04`, `SPEC-002 §5`).
- Nenhum agente commita dado real de programa. Só fixtures anônimas.
- Nenhum agente edita `contracts/` sem passar pelo `spec-guardian`.
