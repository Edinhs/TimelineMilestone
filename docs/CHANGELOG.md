# Histórico

## Não publicado
- A OPR foi refinada para a composição executiva de cronograma + tabela nativa
  **Next Steps**. Scope e Risk/Open Points podem ser ligados opcionalmente; ao
  desligar, o texto permanece preservado e a tabela volta a ocupar toda a base.
  A tabela usa colunas proporcionais, cabeçalho cinza e grade preta no palco e
  no PowerPoint. Schema 1.14 adiciona `element.hidden` (ADR-015, SPEC-008).
- A capa da apresentação passa a seguir o visual corporativo de tela inteira:
  fundo azul com ondas pontilhadas, logo Stellantis no topo, título editável no
  canto inferior esquerdo e segunda logo no rodapé. O fundo padrão fica embutido
  para uso offline, pode ser trocado e restaurado. “Gerar do projeto” agora cria
  somente **Capa** e **Cronograma do programa** (ADR-014).
- A OPR agora gera e sincroniza **um slide individual por componente**. Cada
  cronograma compacto mostra somente as atividades e os marcadores do componente
  vinculado; marcos do programa permanecem. Slides legados são reaproveitados,
  conteúdo autoral é preservado e a operação é idempotente. Schema 1.13 (ADR-013).
- Marcadores individuais agora exibem também sua data no cronograma, no formato
  curto e inequívoco `03/Mai/2027`.
- **Janela do eixo** ganhou dois modelos: **Ano > Mês** (padrão compatível) e
  **Mês > Semana ISO**, com rótulos `Week31`, `Week32` etc. A escolha também
  alcança o cronograma compacto; schema 1.12, aditivo (ADR-012).
- Textos personalizáveis dos slides agora aceitam edição direta no palco: um
  clique posiciona o cursor; arrastar continua movendo o elemento.
- O OPR ganhou **+ Imagem**, troca e remoção da imagem selecionada. Imagens
  livres mantêm arraste, redimensionamento, reaplicação da grade e exportação PPTX.
- Caixas de texto agora abrem um pop-up contextual com fonte, tamanho, cor,
  negrito, itálico, sublinhado, alinhamento e restauração; o formato é preservado
  no arquivo do projeto e na exportação PPTX. Schema 1.11, aditivo.
- Interface reformulada como dashboard corporativo claro: menu superior único
  e compacto, status do programa e seis KPIs com iconografia.
- Em larguras menores, a navegação superior mantém rolagem própria; o
  editor e a Preview continuam empilháveis no celular.
- O tema inicial passa a ser claro para manter consistência com o dashboard;
  automático e escuro continuam disponíveis pelo controle de tema.
- A primeira versão da aba **OPR** estabeleceu o one-pager como slide do próprio
  deck, compartilhando preview, edição e exportação com a Apresentação. Sua
  grade de cards foi posteriormente substituída pela composição do ADR-015.
- Elemento **semáforo** (`status`): rótulo, número de casas e casa acesa
  editáveis; exportado como formas nativas, sem imagem colada.
- Texto com **estilo por trecho** (`runs`): rótulo sublinhado, ênfase em negrito
  e cor dentro da mesma linha, espelhando `a:r` do OOXML.
- **Cronograma compacto** (`chart.variant`): régua de anos, régua de meses de uma
  letra, bandeirinhas de marco com linha-guia até a fase e barras empacotadas por
  ocupação — sem painel de componentes, legenda, título nem logo. É o desenho da
  área superior do OPR e pode ser inserido em qualquer slide (SPEC-002 §9).
- Marca institucional já embutida no slide OPR, na proporção certa; datas dos
  marcos no formato `23/Jun/2025`; rótulo de linha com sublinhado opcional.
- Schema 1.9: `layout: "opr"`, elemento `status` e `runs[]` no texto.
  Schema 1.10: `chart.variant`. Aditivos.
- Aba **Apresentação** ampliada com alinhamento ao slide, camadas, clipboard,
  notas do apresentador e reordenação de slides.
- Modelos reutilizáveis `.tlstpl`, salvos e aplicados por arquivo local, com
  validação defensiva, IDs remapeados e capa institucional restaurada.
- O projeto demonstrativo passou a abrir com deck executivo profissional; o
  roteiro inicial de seis slides foi substituído pelo modelo essencial de dois
  slides em ADR-014.
- Exportador PPTX deixa de mutar o deck e reconhece PNG/JPEG pela assinatura da
  mídia, evitando relacionamentos órfãos e tipos incorretos.
- Documentação consolidada para distinguir implementação atual, arquitetura-alvo e gates pendentes.
- Editor redimensionável por arraste ou teclado, limitado a metade da área útil e com restauração por duplo clique.
- Navegação principal movida da lateral para uma barra horizontal abaixo do cabeçalho.
- Painéis responsivos: tabelas, campos e ações largas permanecem contidos e acessíveis por rolagem interna da seção.
- Visão geral redesenhada com status explicável, prioridades, cobertura de fornecedores, escopo visível e atalhos de correção.
- Visão geral com aba **Histórico de versões**, preenchida automaticamente após salvamentos com mudanças.
- Navegação renomeada para **Projeto**, **Milestones** e **Timeline**.
- Ocultação individual e reversível de componentes e milestones, sem excluir os dados.
- Preview do cronograma com entrada e saída em tela cheia, mantendo zoom e validação acessíveis.
- Schema 1.8: `hidden` opcional e histórico persistente de diferenças por projeto.

## 0.3.0
- Aba **Apresentação**: editor de slides (texto, imagem, formas, tabelas, cronograma),
  layouts e tema pré-configurados, geração automática do deck e exportação `.pptx`.
- **Capa institucional travada** conforme o padrão Stellantis: só texto e imagem de fundo.
- **Salvamento em pasta escolhida** (OneDrive/SharePoint), automático opcional e
  guarda de conflito quando outra pessoa grava no mesmo arquivo.
- Painéis divididos em **seções recolhíveis** com resumo no cabeçalho fechado.
- Editor de **marcadores** por atividade; marcador novo nasce centralizado na barra.
- Temas claro/escuro/automático com contraste verificado em AA.
- Correções: laço do `ResizeObserver`, zoom morto por `viewDims` não declarada,
  foco perdido ao digitar em vários campos, amostra da legenda dessincronizada.

## 0.2.0
- Portfólio multiprojeto em `.tlsws`; atual **Visão geral** de consulta e auditoria (`A2xx`).
- Fornecedor por componente; legenda editável; dimensões por projeto.
- Exportações PDF vetorial, PNG 300 dpi, SVG, CSV e XLSX com quatro abas.

## 0.1.0
- Núcleo: domínio, validação, engine de render e as duas telas de entrada.
- Interoperabilidade com o layout legado do Schedule Generator Tool.
