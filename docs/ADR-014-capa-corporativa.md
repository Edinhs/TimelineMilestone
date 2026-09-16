# ADR-014 — Capa corporativa personalizável e deck essencial

**Status:** aceito · **Data:** 2026-09-14 · **Decisor:** Ederson

## Contexto

A capa anterior dividia o slide entre uma faixa sólida e uma área de foto. O
modelo de referência solicitado usa uma composição Stellantis de tela inteira:
fundo azul com ondas pontilhadas, logo principal no topo, título grande no canto
inferior esquerdo e uma segunda assinatura no rodapé direito.

O gerador também criava seis slides, mas o fluxo atual precisa somente da capa e
do cronograma. Resumo executivo, marcos do programa, fornecedores e riscos com
próximos passos permanecem disponíveis em outras áreas do produto, porém não
devem nascer automaticamente no deck.

## Decisão

1. A capa usa um fundo 16:9 de tela inteira em `cover-photo` (960 × 540 no
   palco), embutido como JPEG para manter o HTML autocontido e offline.
2. O PNG original, o JPEG otimizado e as versões fonte/branca da logo ficam em
   `docs/assets/` como fonte visual auditável. O JPEG e a logo branca são as
   versões incorporadas no aplicativo.
3. As duas marcas Stellantis são elementos separados, brancos e transparentes,
   com geometria travada. Elas não fazem parte da imagem de fundo.
4. `cover-title`, `cover-sub`, `cover-line3` e `cover-author` continuam como
   caixas editáveis. O título inicial segue o padrão
   `<nome do projeto> – Project status`.
5. O usuário pode trocar o fundo e restaurar o padrão corporativo. Reaplicar o
   layout preserva a imagem escolhida e o texto, mas restaura a geometria.
6. “Gerar do projeto” substitui o deck por exatamente dois slides: `Capa` e
   `Cronograma do programa`. A geração OPR continua separada e cria um slide por
   componente, conforme ADR-013.

## Compatibilidade

Não há alteração do contrato 1.13. O segundo logo reutiliza o tipo `image`, os
papéis continuam strings livres em `role` e o fundo permanece uma `data URI`
PNG/JPEG aceita pelo schema. Projetos antigos recebem o novo fundo ao reaplicar
uma capa que não possua imagem; fundos personalizados continuam preservados.

## Consequências

- O arquivo HTML cresce cerca de 400 KB por causa do JPEG embutido.
- Um deck gerado também guarda o fundo no documento do projeto, mantendo a
  portabilidade offline já assumida em ADR-006.
- O roteiro automático fica mais simples e previsível. Slides adicionais ainda
  podem ser criados manualmente, por modelo `.tlstpl` ou pela aba OPR.

## Verificação

- suíte de núcleo verifica dois slides, fundo incorporado, duas logos, título
  inicial, preservação do texto/fundo e pacote PPTX sem slides removidos;
- harness de interface verifica o deck inicial e a geração em dois slides;
- QA visual em navegador deve confirmar composição, edição do título, troca e
  restauração do fundo em desktop e viewport estreita.
