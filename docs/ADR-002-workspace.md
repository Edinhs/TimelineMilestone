# ADR-002 — Portfólio: um arquivo de workspace, não N arquivos nem storage do navegador

**Status:** aceito · **Data:** 2026-08-24 · **Decisor:** Ederson

## Contexto

O usuário precisa alternar entre projetos sem perder o que digitou em cada um, e
poder salvar. O tool legado resolve isso com **um `.xlsm` por projeto**
(`Timing_291.xlsm`, `Timing_358.xlsm`…) numa pasta compartilhada, mais uma aba
`Projetos` replicada em todos os arquivos funcionando como índice.

## Opções consideradas

| Opção | Prós | Contras |
|-------|------|---------|
| **A. N arquivos + índice replicado** (modelo legado) | Familiar; arquivos independentes | O índice é copiado em cada arquivo e desatualiza; trocar de projeto é abrir outro arquivo; nenhuma visão de portfólio real |
| **B. `localStorage` / IndexedDB** | Persiste sem o usuário salvar | Dado de programa fica preso ao perfil do navegador, invisível, não versionável, não compartilhável, e some ao limpar cache. Fere NF-06 e a regra 6 do `CLAUDE.md`. Também não funciona quando o HTML roda dentro de um iframe sandboxed |
| **C. Um arquivo `.tlsws` com N projetos + salvamento explícito** | Portfólio inteiro num artefato só, versionável em pasta de rede; trocar de projeto é instantâneo e em memória; export por projeto continua existindo | Exige salvar (mitigado por aviso de saída e Ctrl+S) |
| **D. Banco / servidor central** | Multiusuário real | Fora do escopo v1.0 (PRD §4.2); infra e aprovação que não temos |

## Decisão

**Opção C.** Um workspace `.tlsws` guarda N documentos de projeto; cada
documento continua validando isoladamente contra `project.schema.json`
(o envelope não injeta campo algum dentro do projeto). Continua sendo possível
salvar **um** projeto como `.tlsproj` e abrir um `.tlsproj` solto — nesse caso
ele entra como mais uma aba, sem descartar o que já estava aberto.

Nenhum armazenamento de navegador. Persistência só por arquivo, escolhido pelo
usuário — igual à regra que já valia para projeto único.

## Consequências

- **Troca de projeto é troca de ponteiro.** `P` aponta para o documento vivo
  dentro de `WS.projects[i].doc`; as edições mutam o objeto no lugar. Não há
  serialização no meio do caminho, logo não há como "perder o que estava
  digitado" ao alternar — o modo de falha clássico desse tipo de tela.
- **Pasta compartilhada é o destino esperado.** O handle retido resolve
  "salvar sempre no mesmo lugar", e a comparação de `lastModified` antes de
  gravar cobre o único risco novo que a pasta compartilhada traz: dois usuários
  no mesmo arquivo. Não é bloqueio nem merge — é aviso. Merge de dois
  workspaces divergentes é problema de outra ordem e não entra na v1.
- **Salvar precisa ser explícito.** Mitigações: indicador de alterações
  pendentes (`•`) na barra, `beforeunload` avisando antes de fechar, `Ctrl+S`,
  e — no Chrome/Edge — File System Access API para gravar por cima do mesmo
  arquivo em vez de baixar uma cópia nova a cada salvamento.
- **`id` da entrada ≠ nome do programa.** Renomear não quebra o `active` nem
  referências futuras.
- Excluir um projeto remove só da memória; o arquivo já salvo continua existindo.
  O diálogo de confirmação diz isso explicitamente.
- Na v2 (portfólio consolidado), o `.tlsws` já é o insumo natural: um arquivo,
  N projetos, sem varredura de pasta.
