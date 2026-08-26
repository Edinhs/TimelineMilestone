# ADR-004 — Painel Home de auditoria e o campo `supplier`

**Status:** aceito · **Data:** 2026-08-25 · **Decisor:** Ederson

## Contexto

O app resolvia bem "montar e desenhar o cronograma". Faltava o outro uso, que é
o mais frequente no dia a dia de um PL: **consultar e auditar**. Perguntas como
"quais marcos individuais já venceram sem a atividade estar concluída?",
"quantas atividades atrasadas cruzam o X0?" e "qual fornecedor concentra o
risco?" exigiam ler o gráfico e contar no olho.

Além disso, cada componente é entregue por um fornecedor, e essa informação não
existia em lugar nenhum — nem no `.xlsm` legado, onde vivia no e-mail de alguém.

## Decisões

### 1. Home é 100% derivada. Nada de auditoria é armazenado.

`auditProgram(p)` é uma função pura sobre o documento: nenhuma contagem, prazo,
situação ou achado é gravado no `.tlsproj`. Motivo: dado derivado que persiste
é dado que desatualiza em silêncio — exatamente o defeito da aba `Projetos`
replicada do arquivo legado (P3 do PRD). Se a Home e o gráfico discordarem, é
bug de código, não de arquivo.

### 2. Achados de auditoria (`A2xx`) são uma família separada de `E0xx`/`W1xx`.

| família | pergunta que responde | consequência |
|---|---|---|
| `E0xx` | o documento é internamente consistente? | bloqueia exportação |
| `W1xx` | algo vai sair estranho no desenho? | apenas avisa |
| `A2xx` | o **programa** está saudável? | nunca bloqueia nada |

Misturar as três geraria um painel de validação que grita sobre gestão de
programa quando o usuário só quer exportar um PNG. `A2xx` vive na Home, e só lá.

Códigos definidos:

| código | nível | achado |
|---|---|---|
| `A201` | info | componente sem fornecedor informado |
| `A202` | atenção | marcador já venceu e a atividade não está concluída |
| `A203` | atenção | atividade em atraso cruza um marco futuro — risco ao marco |
| `A204` | atenção | atividade termina depois do último marco do programa |
| `A205` | atenção | fornecedor concentra 2 ou mais atividades em atraso |

### 3. `supplier` fica no componente, não na atividade.

O fornecedor entrega o componente inteiro (o cluster, o áudio), não uma fase
isolada dele. Pendurar na atividade multiplicaria a mesma informação por 5–9
linhas e abriria espaço para divergência dentro do próprio componente. Uma
atividade herda o fornecedor do seu componente.

Bump aditivo **1.1 → 1.2**, mesma mecânica do ADR-003: campo opcional,
documentos anteriores continuam válidos, ausência significa "não informado" e
gera `A201`. Sem migração.

### 4. O fornecedor **não** entra no desenho.

O Gantt reproduz o arquivo de referência, onde não existe coluna de fornecedor.
Acrescentar texto ali quebraria a fidelidade visual que a SPEC-002 protege. O
fornecedor aparece na Home, nas tabelas exportadas e na aba `Auditoria` do
Excel — todos contextos de consulta, não de apresentação.

## Consequências

- A Home vira a **aba padrão**: quem abre o app na maioria das vezes quer
  consultar, não editar. Editar continua a um clique.
- `auditProgram` é pura e testável sem UI, como o resto do núcleo.
- Export XLSX ganha uma quarta aba, `Auditoria`, e a coluna `Supplier` é
  **anexada ao fim** do layout legado de `Input Timeline` — nunca no meio, para
  não deslocar as colunas que a macro antiga espera. O importador lê a coluna
  se ela existir e ignora se não.
- Risco assumido: `A203` e `A205` são heurísticas de gestão, não verdades. São
  rotuladas como "atenção" e nunca bloqueiam nada, justamente por isso.
