# SPEC-001 — Domínio, validação e cálculos

**Dono:** agente `domain-modeler` · **Depende de:** `contracts/project.schema.json` (congelado)

## 1. Modelos (Pydantic v2, `core/domain/models.py`)

Espelho 1:1 do JSON Schema. Nada de campo extra sem bump de `schema_version`.
O contrato está em **1.4**. Quatro bumps aditivos até aqui, nenhum com migração:
1.1 acrescentou `project.layout` (ADR-003), 1.2 `components[].supplier`
(ADR-004), 1.3 `project.legend` (ADR-005) e 1.4 `project.owner` — responsável
pelo cronograma, string de até 60 caracteres.

`owner` não ganhou ADR próprio: é um campo de texto que segue exatamente a
mecânica já decidida em ADR-003 (opcional, aditivo, ausência = padrão, sem
migração). Abrir um registro de decisão para cada campo novo transformaria o
histórico de decisões em changelog, e ninguém lê changelog procurando o
porquê de nada. Documentos anteriores continuam válidos; o
carregador só reescreve `schema_version` e os campos ausentes assumem o padrão.

`supplier` é o fornecedor responsável pelo componente — string de até 60
caracteres, opcional. Fica no **componente**, não na atividade: o fornecedor
entrega o componente inteiro, e pendurar na atividade multiplicaria a mesma
informação por 5–9 linhas. Uma atividade herda o fornecedor do seu componente.

```
Project(schema_version, project: ProjectMeta, milestones: list[Milestone],
        groups: list[Group], components: list[Component], activities: list[Activity])
```

Regras de serialização: datas em ISO `YYYY-MM-DD`; `model_dump(mode="json")`
deve produzir um documento que valida contra o JSON Schema (teste obrigatório).

## 2. Enum de status → semântica

| valor | legenda na referência | significado |
|-------|----------------------|-------------|
| `ontime` | Ontime | no prazo |
| `delayed` | Delayed | atrasado, ainda aberto |
| `concluded` | Concluded | concluído no prazo |
| `concluded_delay` | Concluded Delay | concluído com atraso |
| `attention` | Attention Point | ponto de atenção / risco |

As **chaves** acima são fixas e fazem parte do contrato: `activities[].status`
aponta para elas, a validação depende delas e o importador mapeia para elas.
O nome exibido é apresentação e pode ser trocado por projeto via
`project.legend` (schema 1.3, ADR-005) — a chave nunca muda. Cor também é
apresentação: vive em SPEC-002, não aqui. O domínio não conhece cor.

As cores vivem em SPEC-002, **não** aqui. O domínio não conhece cor.

## 3. Cálculo de duração (`core/calc/duration.py`)

Espelha o UDF VBA `calcula_intervalo(inicio, fim, "m"|"w")`.

```python
def weeks(start: date, end: date) -> int:
    """Semanas corridas, arredondadas. Intervalo inclusivo no início, exclusivo no fim."""
    return max(1, round((end - start).days / 7))

def months(start: date, end: date) -> int:
    m = (end.year - start.year) * 12 + (end.month - start.month)
    if end.day < start.day:
        m -= 1
    return max(1, m)
```

> ⚠️ **Bloqueante (PRD §10.4):** confirmar contra o VBA real se "semana" é
> semana corrida ou semana calendário ISO, e se o arredondamento é `round`,
> `ceil` ou truncamento. Até a confirmação, `weeks()` fica marcada
> `# TODO: validar contra calcula_intervalo` e existe um teste de paridade
> (`tests/test_duration_parity.py`) alimentado por uma tabela de casos
> extraídos do arquivo legado.

Formatação do rótulo: `f"{n}{unit}"` → `56W`, `13M`. Se
`show_duration=false` ou `duration_unit="none"`, o rótulo é só o nome.

## 4. Validações (`core/domain/validate.py`)

Cada regra retorna `Issue(level, code, path, message)`.
`level ∈ {error, warning}` — **error** bloqueia export, **warning** não.

| código | nível | regra |
|--------|-------|-------|
| `E001` | error | `end >= start` em toda atividade |
| `E002` | error | IDs duplicados (milestone, component, activity) |
| `E003` | error | `activity.component_id` inexistente |
| `E004` | error | `component.group_id` inexistente (quando não-nulo) |
| `E005` | error | duas atividades do mesmo `component_id` + `lane` se sobrepõem no tempo |
| `E006` | error | `chart_end > chart_start` |
| `W101` | warning | atividade fora da janela `chart_start..chart_end` (será clipada) |
| `W102` | warning | marcador fora do intervalo da própria barra |
| `W103` | warning | marco fora da janela do eixo |
| `W104` | warning | componente sem nenhuma atividade |
| `W105` | warning | rótulo longo demais para caber na barra (será movido para `above`) |

### Achados de auditoria (`A2xx`) não são `Issue`

`auditProgram` (SPEC-006) devolve uma família separada, `A201`–`A205`, que
responde "o programa está saudável?" e **nunca bloqueia nada**. `validate`
responde "o documento é consistente?". Não misture as duas: um painel de
validação que reclama de gestão de programa quando o usuário só quer exportar
um PNG é um painel que o usuário aprende a ignorar. Detalhe em ADR-004 §2.

`project.layout` **não** gera `Issue`: valor fora da faixa é fixado no limite
pelo resolvedor de tokens (SPEC-002 §2), porque é preferência de apresentação,
não dado de programa — recusar o arquivo por causa disso seria desproporcional.

**Anti-regressão explícita:** nenhum campo do domínio pode conter fórmula ou
referência a outra célula. O bug de fórmula auto-referenciada em `Final Date`
do arquivo legado é estruturalmente impossível aqui — datas são valores.

## 5. Layout de lanes (`core/calc/layout.py`)

- Uma `lane` é uma linha física dentro de um componente.
- `lane` explícita é respeitada. Se ausente/`0` e houver conflito, o
  auto-empacotador atribui a menor lane livre (algoritmo guloso por `start`).
- Altura de um componente = `(max_lane + 1) * ROW_H`.
- A ordem visual dos componentes é `order`, depois `group.order`, depois nome.

## 6. API pública do módulo (contrato para os outros agentes)

```python
load_project(path: Path) -> Project
validate_project(p: Project) -> list[Issue]
audit_program(p: Project) -> AuditReport   # SPEC-006; puro, nada persistido
compute_layout(p: Project) -> LayoutModel   # componentes/lanes resolvidos, sem pixel
```

`LayoutModel` **não** contém pixels — só ordem, lanes e durações. A conversão
para coordenadas é responsabilidade de SPEC-002.

## 7. Testes obrigatórios

1. Round-trip `fixture-teste.json` → `Project` → JSON idêntico (byte a byte após normalização).
2. Toda regra `E0xx`/`W1xx` tem ao menos um caso positivo e um negativo.
3. Paridade de duração contra tabela extraída do legado.
4. Property test: para qualquer projeto válido, `compute_layout` nunca produz sobreposição na mesma lane.
