# ADR-008 — Histórico de versões por salvamento

## Contexto

O workspace indicava apenas o último horário salvo. Não havia uma trilha que
permitisse entender quais campos do projeto haviam mudado entre salvamentos.

## Decisão

O schema 1.8 acrescenta `version_history[]` ao documento de cada projeto. Uma
entrada é criada somente quando um salvamento bem-sucedido contém diferenças em
relação ao último estado salvo conhecido naquela sessão.

Cada versão contém número sequencial, data/hora ISO e alterações com caminho,
ação, valor anterior e valor posterior. Arrays de entidades usam seus IDs nos
caminhos, como `activities[a1].end`, evitando ruído quando a ordem muda.

O histórico é excluído da própria comparação e os valores registrados são
limitados a 160 caracteres. Ele é uma trilha de auditoria legível, não um backup
com restauração automática.

## Regras de consistência

- Conflito recusado ou falha de gravação não gera versão.
- Salvamento sem mudança não gera versão.
- Projetos antigos abrem com histórico vazio.
- Abrir um arquivo estabelece o conteúdo carregado como nova linha de base.
- Salvamento automático segue as mesmas regras do salvamento manual.

## Consequências

O arquivo cresce conforme a quantidade de mudanças registradas. Como não há
snapshot completo, restauração e comparação visual entre duas versões ficam
fora deste incremento e podem ser tratadas em uma evolução posterior.
