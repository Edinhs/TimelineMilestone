/* Testes de interface: carrega o app inteiro em jsdom e exerce os caminhos
   que só quebram em tempo de execução (SPEC-003 §4d). */
import { JSDOM } from "jsdom";
import fs from "node:fs";
import { t, eq, ok, group, report } from "./harness.mjs";
import { APP } from "./harness.mjs";

const erros = [];
let escritas = 0, mtime = 1000, permissao = "granted";
let ultimoConfirm = "", respostaConfirm = true;
let fullscreenEl = null;

const handle = {
  name:"Cronogramas.tlsws",
  queryPermission:async () => permissao,
  requestPermission:async () => (permissao = "granted"),
  getFile:async () => ({ lastModified:mtime, text:async () => JSON.stringify({ ws_version:"1.0", projects:[] }) }),
  createWritable:async () => ({ write:async () => { escritas++; mtime += 1; }, close:async () => {} })
};

const dom = new JSDOM(fs.readFileSync(APP, "utf8"), {
  runScripts:"dangerously", pretendToBeVisual:true,
  beforeParse(w) {
    w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    w.matchMedia = () => ({ matches:false, addEventListener() {}, addListener() {} });
    Object.defineProperty(w.Document.prototype, "fullscreenElement", { get() { return fullscreenEl; } });
    w.HTMLElement.prototype.requestFullscreen = function() {
      fullscreenEl = this; w.document.dispatchEvent(new w.Event("fullscreenchange")); return Promise.resolve();
    };
    w.Document.prototype.exitFullscreen = function() {
      fullscreenEl = null; this.dispatchEvent(new w.Event("fullscreenchange")); return Promise.resolve();
    };
    Object.defineProperty(w.HTMLElement.prototype, "clientWidth", { get() { return 700; } });
    Object.defineProperty(w.HTMLElement.prototype, "clientHeight", { get() { return 420; } });
    w.URL.createObjectURL = () => "blob:x"; w.URL.revokeObjectURL = () => {};
    /* jsdom não traz canvas; stub suficiente para o caminho da logo branca da capa */
    w.HTMLCanvasElement.prototype.getContext = () => ({
      drawImage() {}, fillRect() {}, putImageData() {},
      getImageData: (x, y, w2, h2) => ({ data:new Uint8ClampedArray(w2 * h2 * 4) })
    });
    w.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
    w.confirm = m => { ultimoConfirm = m; return respostaConfirm; };
    w.showSaveFilePicker = async () => handle;
    w.showOpenFilePicker = async () => [handle];
    w.addEventListener("error", e => erros.push(e.message));
  }
});
const W = dom.window, D = W.document;
const q = s => D.querySelector(s), qa = s => [...D.querySelectorAll(s)];
const click = el => el && el.dispatchEvent(new W.MouseEvent("click", { bubbles:true }));
const input = el => el.dispatchEvent(new W.Event("input", { bubbles:true }));
const aba = n => click(qa(".tab").find(x => x.dataset.tab === n));
const espera = ms => new Promise(r => setTimeout(r, ms));
await espera(700);

group("Boot");
t("carrega sem erro de execução", () => eq(erros, []));
t("exibe a marca Stellantis no cabeçalho", () => {
  const logo = q("#brandLogo");
  eq(logo.alt, "Stellantis");
  ok(logo.src.startsWith("data:image/png;base64,"), "logo institucional não carregada");
  ok(!q(".brand").textContent.includes("Timeline Studio"), "nome antigo ainda visível");
});
t("desenha o cronograma no palco", () => ok((q("#paper").innerHTML || "").length > 1000));
t("faixa de indicadores é preenchida", () => ok(qa(".kpi").length >= 5));
t("exemplo abre com deck executivo pronto e sem dirty", () => {
  eq(W.eval("P.project.deck.slides.map(s=>s.title)"), ["Capa", "Cronograma do programa"]);
  ok(W.eval("P.project.deck.slides[0].elements.find(e=>e.role==='cover-photo').src.startsWith('data:image/jpeg;base64,')"));
  eq(W.eval("P.project.deck.slides[0].elements.filter(e=>/cover-logo/.test(e.role||'')).length"), 2);
  eq(W.eval("dirty"), false);
});

group("Zoom");
t("ajuste inicial é aplicado", () => ok(parseInt(q("#zoomLbl").textContent) < 100));
t("botões alteram a escala", () => {
  const antes = q("#paper").style.transform;
  click(q('[data-zoom="+"]'));
  ok(q("#paper").style.transform !== antes, "não mudou");
});
t("100% e ajuste voltam a valores coerentes", () => {
  click(q('[data-zoom="1"]')); eq(q("#zoomLbl").textContent, "100%");
  click(q('[data-zoom="fit"]')); ok(parseInt(q("#zoomLbl").textContent) < 100);
});

group("Tela cheia da Preview");
t("entra e sai da tela cheia pelo mesmo botão", () => {
  const b = q("#fullscreenBtn");
  click(b);
  eq(D.fullscreenElement, q("#previewShell"));
  eq(b.getAttribute("aria-pressed"), "true");
  ok(/Sair/.test(b.textContent));
  click(b);
  eq(D.fullscreenElement, null);
  eq(b.getAttribute("aria-pressed"), "false");
  ok(/Tela cheia/.test(b.textContent));
});

group("Abas e seções");
t("todas as abas renderizam sem erro", () => {
  ["home", "apresentacao", "opr", "projeto", "milestone", "timeline"].forEach(n => {
    aba(n); ok((q("#pane").innerHTML || "").length > 200, n);
  });
  eq(erros, []);
});
t("painéis viram seções recolhíveis", () => {
  aba("projeto");
  ok(qa("details.sec").length >= 4);
  eq(qa("details.sec").filter(x => x.open).length, 1, "só a primeira aberta:");
});
t("resumo aparece no cabeçalho fechado", () => {
  aba("projeto");
  ok(qa(".sec-h").some(x => x.textContent.includes("→")), "janela do eixo no resumo");
});
t("expandir e recolher tudo", () => {
  click(q('[data-sec-all="1"]')); ok(qa("details.sec").every(x => x.open));
  click(q('[data-sec-all="0"]')); ok(qa("details.sec").every(x => !x.open));
});
t("navegação usa os nomes solicitados", () => {
  const nomes = Object.fromEntries(qa(".tab").map(x => [x.dataset.tab, x.querySelector(".tab-name").textContent]));
  eq([nomes.projeto, nomes.milestone, nomes.timeline], ["Projeto", "Milestones", "Timeline"]);
});
t("Janela do eixo alterna entre os dois modelos", () => {
  aba("projeto");
  const model = q('[data-p="axis_mode"]');
  eq([...model.options].map(o => o.value), ["month", "week"]);
  model.value = "week"; input(model);
  eq(W.eval("P.project.axis_mode"), "week");
  ok(q("#paper").textContent.includes("Week31"), "Preview não mudou para semanas");
  model.value = "month"; input(model);
  eq(W.eval("P.project.axis_mode"), "month");
  ok(!q("#paper").textContent.includes("Week31"), "Preview não voltou para meses");
});
t("faixa de indicadores aparece somente na Visão geral", () => {
  ["apresentacao", "opr", "projeto", "milestone", "timeline"].forEach(n => {
    aba(n);
    ok(q("#kpis").classList.contains("is-hidden"), `indicadores visíveis em ${n}`);
    eq(q("#kpis").children.length, 0, `indicadores renderizados em ${n}`);
  });
  aba("home");
  ok(!q("#kpis").classList.contains("is-hidden"), "indicadores ocultos na Visão geral");
  eq(q("#kpis").children.length, 6);
});
t("navegação principal fica em um único menu superior compacto", () => {
  const tabs = q(".tabs"), css = W.getComputedStyle(tabs);
  eq(css.flexDirection, "row");
  eq(tabs.closest("header"), q(".masthead"));
  eq(qa(".tabs").length, 1, "deve existir apenas um menu de seções");
  eq(q(".side-brand"), null, "a marca lateral não deve existir");
  eq(W.getComputedStyle(q("#pane")).gridRow, "1");
  eq(W.getComputedStyle(q(".masthead")).height, "58px");
});
t("divisor redimensiona o editor entre o mínimo e metade da tela", () => {
  const main = q(".main"), splitter = q("#paneSplitter");
  eq(splitter.getAttribute("role"), "separator");
  splitter.dispatchEvent(new W.MouseEvent("mousedown", { bubbles:true, button:0, clientX:300 }));
  W.dispatchEvent(new W.MouseEvent("mousemove", { bubbles:true, clientX:1000 }));
  W.dispatchEvent(new W.MouseEvent("mouseup", { bubbles:true }));
  eq(main.style.getPropertyValue("--editor-w"), "346px");
  eq(splitter.getAttribute("aria-valuenow"), "50");
  splitter.dispatchEvent(new W.MouseEvent("mousedown", { bubbles:true, button:0, clientX:300 }));
  W.dispatchEvent(new W.MouseEvent("mousemove", { bubbles:true, clientX:-1000 }));
  W.dispatchEvent(new W.MouseEvent("mouseup", { bubbles:true }));
  eq(main.style.getPropertyValue("--editor-w"), "280px");
  splitter.dispatchEvent(new W.KeyboardEvent("keydown", { bubbles:true, key:"End" }));
  eq(main.style.getPropertyValue("--editor-w"), "346px");
  splitter.dispatchEvent(new W.KeyboardEvent("keydown", { bubbles:true, key:"Home" }));
  eq(main.style.getPropertyValue("--editor-w"), "280px");
  splitter.dispatchEvent(new W.MouseEvent("dblclick", { bubbles:true }));
  eq(main.style.getPropertyValue("--editor-w"), "");
});
t("conteúdo largo permanece acessível dentro da seção", () => {
  aba("projeto");
  const legenda = qa("details.sec").find(x => x.querySelector(".sec-t")?.textContent === "Legenda");
  const corpo = legenda?.querySelector(".sec-b");
  ok(!!corpo?.querySelector("table"), "tabela da legenda ausente");
  eq(W.getComputedStyle(corpo).overflowX, "auto");
  eq(W.getComputedStyle(q("#pane")).overflowX, "hidden");
  eq(W.getComputedStyle(corpo.querySelector("table")).minWidth, "max-content");
});
t("Visão geral apresenta status, indicadores e prioridades", () => {
  aba("home");
  ok(!!q(".overview-banner"), "status executivo ausente");
  eq(qa(".kpi").length, 6);
  ok(!q("#projectStatus").classList.contains("is-hidden"), "status não aparece junto ao programa");
  eq(q("#viewTitle").textContent, W.eval("P.project.name"));
  eq(qa(".overview-card").length, 5);
  ok(qa(".priority-item").length >= 1, "prioridades ausentes");
  ok(q(".overview-banner").compareDocumentPosition(q(".secbar")) & W.Node.DOCUMENT_POSITION_FOLLOWING,
    "resumo executivo não aparece antes das seções detalhadas");
});
t("atalho executivo abre a Timeline", () => {
  click(q('.overview-actions [data-jump="tl"]'));
  eq(q('.tab[data-tab="timeline"]').getAttribute("aria-selected"), "true");
  aba("home");
});

group("Visibilidade individual");
t("componente pode ser ocultado e exibido sem ser excluído", () => {
  aba("timeline");
  const first = q("[data-toggle-c]"), id = first.dataset.toggleC;
  const total = qa("[data-pick]").length;
  click(first);
  eq(qa("[data-pick]").length, total, "componente foi removido:");
  ok(q(`[data-pick="${id}"]`).classList.contains("is-hidden"), "estado oculto não apareceu");
  eq(q(`[data-toggle-c="${id}"]`).getAttribute("aria-pressed"), "false");
  click(q(`[data-toggle-c="${id}"]`));
  ok(!q(`[data-pick="${id}"]`).classList.contains("is-hidden"), "não voltou a aparecer");
});
t("milestone pode ser ocultado e exibido sem ser excluído", () => {
  aba("milestone");
  const first = q("[data-toggle-m]"), id = first.dataset.toggleM;
  const total = qa("[data-m][data-f=label]").length;
  click(first);
  eq(qa("[data-m][data-f=label]").length, total, "milestone foi removido:");
  ok(q(`[data-toggle-m="${id}"]`).closest("tr").classList.contains("item-hidden"));
  click(q(`[data-toggle-m="${id}"]`));
  ok(!q(`[data-toggle-m="${id}"]`).closest("tr").classList.contains("item-hidden"));
});

group("Foco durante a digitação");
t("nome do status não perde o foco", () => {
  aba("projeto"); qa("details.sec").forEach(x => x.open = true);
  const el = q('[data-lg="label:ontime"]'); el.focus();
  "No prazo".split("").forEach((_, i) => { el.value = "No prazo".slice(0, i + 1); input(el); });
  ok(D.activeElement === el, "foco perdido");
  eq(el.value, "No prazo");
});
t("amostra acompanha a cor", () => {
  const f = q('[data-lg="fill:ontime"]'); f.value = "#ff0000"; input(f);
  ok(q("#lg-sample-ontime").style.background.includes("255, 0, 0"));
});
t("marcador: rótulo e data mantêm o foco", () => {
  aba("timeline"); qa("details.sec").forEach(x => x.open = true);
  click(qa("[data-pick]")[2]); qa("details.sec").forEach(x => x.open = true);
  const l = q('[data-mkf="label"]'); l.focus(); l.value = "DTOP revisado"; input(l);
  ok(D.activeElement === l, "rótulo perdeu foco");
  const d = q('[data-mkf="date"]'); d.focus(); d.value = "2020-01-01"; input(d);
  ok(D.activeElement === d, "data perdeu foco");
  ok(d.classList.contains("bad"), "não sinalizou fora da barra");
});
t("marcador novo entra centralizado", () => {
  const add = q("[data-mk-add]"); const aid = add.dataset.mkAdd;
  click(add);
  const r = W.eval(`(()=>{const a=P.activities.find(x=>x.id==="${aid}");return [a.markers[a.markers.length-1].date, midOf(a)];})()`);
  eq(r[0], r[1]);
});

group("Apresentação");
t("gera o deck e monta o palco", () => {
  aba("apresentacao"); click(q('[data-deck="gen"]'));
  eq(qa("[data-slide]").length, 2);
  ok(!!q("#stage"), "palco não montou");
  ok(q("#dims").textContent.includes("960"), "palco não é 16:9");
});
t("capa é travada", () => {
  W.eval("curSlide().elements.find(e=>e.role==='cover-photo').src='data:image/jpeg;base64,/9j/'; renderPreview()");
  const el = q("#stage [data-el]");
  el.dispatchEvent(new W.MouseEvent("mousedown", { bubbles:true, clientX:100, clientY:100 }));
  ok(/Capa padrão Stellantis/.test(q("#pane").innerHTML), "inspetor não avisou");
  ok(!q("#stage .rsz"), "elemento travado tem alça de resize");
  ok(q('[data-align="left"]').disabled, "alinhamento da capa não foi bloqueado");
  ok(q('[data-clip="copy"]').disabled, "cópia da capa não foi bloqueada");
  ok(!!q('[data-cover-photo="clear"]'), "restauração do fundo não apareceu");
  click(q('[data-cover-photo="clear"]'));
  ok(W.eval("curSlide().elements.find(e=>e.role==='cover-photo').src.length") > 100000,
    "fundo corporativo não foi restaurado");
});
t("tabela é criada e editada diretamente pelas células", () => {
  click(qa("[data-slide]")[1]);
  const before = W.eval("curSlide().elements.length");
  click(q('[data-ins="table"]'));
  eq(W.eval("curSlide().elements.length"), before + 1);
  eq(W.eval("selectedElement().type"), "table");
  eq(qa("#stage [data-table-cell]").length, 9);

  const first = q('#stage [data-table-cell="0:0"]');
  ok(D.activeElement === first, "a primeira célula não recebeu foco");
  first.value = 'Entrega & revisão <final> "A"'; input(first);
  ok(D.activeElement === first, "a célula perdeu o foco ao digitar");
  eq(W.eval("selectedElement().rows[0][0]"), 'Entrega & revisão <final> "A"');

  const second = q('#stage [data-table-cell="1:1"]');
  const position = W.eval("[selectedElement().x,selectedElement().y]");
  second.dispatchEvent(new W.MouseEvent("mousedown", { bubbles:true, clientX:200, clientY:200 }));
  W.dispatchEvent(new W.MouseEvent("mousemove", { bubbles:true, clientX:280, clientY:260 }));
  W.dispatchEvent(new W.MouseEvent("mouseup", { bubbles:true }));
  eq(W.eval("[selectedElement().x,selectedElement().y]"), position);
  second.focus();
  D.dispatchEvent(new W.KeyboardEvent("keydown", { bubbles:true, key:"Delete" }));
  eq(W.eval("curSlide().elements.length"), before + 1, "Delete na célula removeu a tabela:");

  click(q('[data-table-act="row-add"]'));
  eq(W.eval("selectedElement().rows.length"), 4);
  click(q('[data-table-act="col-add"]'));
  eq(W.eval("selectedElement().rows.every(row=>row.length===4)"), true);
  click(q('[data-table-act="row-del"]'));
  click(q('[data-table-act="col-del"]'));
  eq(W.eval("[selectedElement().rows.length,selectedElement().rows[0].length]"), [3, 3]);
});
t("elemento livre arrasta", () => {
  click(qa("[data-slide]")[1]);
  const el = q("#stage [data-el]");
  const id = el.dataset.el;
  const antes = W.eval(`(()=>{const s=curSlide();const e=s.elements.find(x=>x.id==="${id}");return [e.x,e.y];})()`);
  el.dispatchEvent(new W.MouseEvent("mousedown", { bubbles:true, clientX:200, clientY:200 }));
  W.dispatchEvent(new W.MouseEvent("mousemove", { bubbles:true, clientX:280, clientY:260 }));
  W.dispatchEvent(new W.MouseEvent("mouseup", { bubbles:true }));
  const depois = W.eval(`(()=>{const s=curSlide();const e=s.elements.find(x=>x.id==="${id}");return [e.x,e.y];})()`);
  ok(antes[0] !== depois[0] || antes[1] !== depois[1], "não moveu");
});
t("slide pode subir e descer sem perder a seleção", () => {
  const title = W.eval("curSlide().title"), before = W.eval("selSlide");
  click(q('[data-deck="move-up"]'));
  eq(W.eval("curSlide().title"), title);
  eq(W.eval("selSlide"), before - 1);
  click(q('[data-deck="move-down"]'));
  eq(W.eval("curSlide().title"), title);
  eq(W.eval("selSlide"), before);
});
t("alinhamento e camadas operam sobre o elemento selecionado", () => {
  click(qa("[data-slide]")[1]);
  const el = q("#stage [data-el]");
  el.dispatchEvent(new W.MouseEvent("mousedown", { bubbles:true, clientX:120, clientY:120 }));
  click(q('[data-align="center"]'));
  eq(W.eval("(()=>{const e=selectedElement();return e.x})()"), W.eval("(()=>{const e=selectedElement();return Math.round((STAGE_W-e.w)/2)})()"));
  const before = W.eval("selectedElement().z||0");
  click(q('[data-el-z="forward"]'));
  ok(W.eval("selectedElement().z||0") >= before, "não avançou uma camada");
  click(q('[data-el-z="front"]'));
  eq(W.eval("selectedElement().z"), W.eval("Math.max(...curSlide().elements.filter(e=>e.id!==selEl).map(e=>e.z||0))+1"));
});
t("clipboard interno e Ctrl+D duplicam sem alternar o tema", () => {
  const before = W.eval("curSlide().elements.length"), theme = W.eval("themeMode");
  click(q('[data-clip="copy"]')); click(q('[data-clip="paste"]'));
  eq(W.eval("curSlide().elements.length"), before + 1);
  const pastedId = W.eval("selEl");
  ok(!W.eval(`curSlide().elements.find(e=>e.id==="${pastedId}").locked`), "colar criou elemento travado");
  q("#pane").focus();
  D.dispatchEvent(new W.KeyboardEvent("keydown", { bubbles:true, key:"d", ctrlKey:true }));
  eq(W.eval("curSlide().elements.length"), before + 2);
  eq(W.eval("themeMode"), theme);
  D.dispatchEvent(new W.KeyboardEvent("keydown", { bubbles:true, key:"x", ctrlKey:true }));
  eq(W.eval("curSlide().elements.length"), before + 1);
  D.dispatchEvent(new W.KeyboardEvent("keydown", { bubbles:true, key:"v", ctrlKey:true }));
  eq(W.eval("curSlide().elements.length"), before + 2);
});
t("atalhos de edição não interceptam campos", () => {
  const notes = q('[data-slide-f="notes"]'), before = W.eval("curSlide().elements.length"), theme = W.eval("themeMode");
  notes.focus();
  D.dispatchEvent(new W.KeyboardEvent("keydown", { bubbles:true, key:"d", ctrlKey:true }));
  eq(W.eval("curSlide().elements.length"), before);
  eq(W.eval("themeMode"), theme);
});
t("Carregar exemplo inclui o deck e não suja um workspace limpo", () => {
  W.eval("dirty=false; updateHint()");
  click(q('[data-act="sample"]'));
  eq(W.eval("P.project.deck.slides.length"), 2);
  eq(W.eval("dirty"), false);
});
t("capa não aceita inserção livre e conversão destrutiva pede confirmação", () => {
  aba("apresentacao"); click(qa("[data-slide]")[0]); qa("details.sec").forEach(x => x.open = true);
  ok(q('[data-ins="text"]').disabled, "inserção ficou ativa na capa");
  click(qa("[data-slide]")[1]); qa("details.sec").forEach(x => x.open = true);
  const before = W.eval("JSON.stringify(curSlide().elements)"), layout = q('[data-slide-f="layout"]');
  respostaConfirm = false; layout.value = "cover"; input(layout);
  eq(W.eval("curSlide().layout"), "chart");
  eq(W.eval("JSON.stringify(curSlide().elements)"), before);
  respostaConfirm = true;
});
t("limites do contrato impedem novos slides e elementos", () => {
  W.eval("P.project.deck.slides=Array.from({length:60},(_,i)=>({id:'s'+i,layout:'blank',title:'S'+i,elements:[]}));selSlide=0;selEl=null;render()");
  click(q('[data-deck="add"]')); eq(W.eval("P.project.deck.slides.length"), 60);
  W.eval("P.project.deck.slides=[{id:'only',layout:'blank',title:'Cheio',elements:Array.from({length:40},(_,i)=>({id:'e'+i,type:'text',x:0,y:0,w:20,h:20,text:'x',z:i}))}];selSlide=0;selEl=null;render()");
  qa("details.sec").forEach(x => x.open = true);
  ok(q('[data-ins="text"]').disabled, "inserção ficou ativa com 40 elementos");
  click(q('[data-ins="text"]')); eq(W.eval("curSlide().elements.length"), 40);
});

group("OPR");

t("aba gera um slide individual por componente no mesmo palco", () => {
  W.eval("P.project.deck={slides:[]};selSlide=0;selEl=null;render()");
  aba("opr");
  ok(/Nenhum slide OPR/.test(q("#pane").innerHTML), "estado vazio não apareceu");
  click(q('[data-opr="generate"]'));
  eq(W.eval("curSlide().layout"), "opr");
  eq(W.eval("oprSlideIndexes().length"), W.eval("P.components.length"));
  eq(W.eval("curSlide().opr_component_id"), W.eval("P.components[0].id"));
  eq(W.eval('curSlide().elements.find(e=>e.role==="opr-chart").component_id'), W.eval("P.components[0].id"));
  ok(!!q('[data-opr-f="context"]'), "opção de Scope/Risk ausente");
  ok(!q('[data-opr-f="context"]').checked, "contexto deveria nascer opcional");
  eq(W.eval('curSlide().elements.find(e=>e.role==="opr-next-steps").rows[0]'),
    ["Next Steps", "Start Date", "Close Date", "Lead Name"]);
  ok(!!q("#stage"), "palco não montou na aba OPR");
  ok(q("#dims").textContent.includes("960"), "aba OPR não usa o palco 16:9");
  eq(q("#stage").querySelectorAll("[data-aid]").length,
    W.eval("P.activities.filter(a=>a.component_id===curSlide().opr_component_id).length"),
    "faixa compacta misturou atividades de outros componentes");
});

t("sincronizar novamente não duplica os slides dos componentes", () => {
  const ids = W.eval("oprSlideIndexes().map(i=>deckOf().slides[i].id)");
  click(q('[data-opr="generate"]'));
  eq(W.eval("oprSlideIndexes().map(i=>deckOf().slides[i].id)"), ids);
  eq(W.eval("oprSlideIndexes().length"), W.eval("P.components.length"));
});

t("opção inclui Scope/Risk, divide a tabela e preserva texto ao ocultar", () => {
  const toggle = q('[data-opr-f="context"]'); toggle.checked = true; input(toggle);
  ok(!!q('[data-opr-f="scope"]') && !!q('[data-opr-f="risk"]'), "campos de contexto não apareceram");
  eq(W.eval('curSlide().elements.find(e=>e.role==="opr-next-steps").x'), W.eval("OPR.tableSplit.x"));
  const scope = q('[data-opr-f="scope"]'); scope.focus(); scope.value = "• Escopo editado"; input(scope);
  ok(D.activeElement === scope, "campo Scope perdeu o foco");
  const risk = q('[data-opr-f="risk"]'); risk.value = "• Risco editado"; input(risk);
  const off = q('[data-opr-f="context"]'); off.checked = false; input(off);
  eq(W.eval('curSlide().elements.find(e=>e.role==="opr-next-steps").x'), W.eval("OPR.tableFull.x"));
  const on = q('[data-opr-f="context"]'); on.checked = true; input(on);
  eq(q('[data-opr-f="scope"]').value, "• Escopo editado");
  eq(q('[data-opr-f="risk"]').value, "• Risco editado");
});

t("status geral responde no editor OPR", () => {
  const status = q('[data-opr-f="status"]'); status.value = "2"; input(status);
  eq(W.eval('curSlide().elements.find(e=>e.role==="opr-status").level'), 2);
});

t("reaplicar composição devolve a posição sem apagar células e contexto", () => {
  W.eval(`(()=>{const t=curSlide().elements.find(e=>e.role==="opr-next-steps");t.rows[1][0]="Entrega autoral";t.x=500;})()`);
  click(q('[data-opr="relayout"]'));
  eq(W.eval('curSlide().elements.find(e=>e.role==="opr-next-steps").x'), W.eval("OPR.tableSplit.x"));
  eq(W.eval('curSlide().elements.find(e=>e.role==="opr-next-steps").rows[1][0]'), "Entrega autoral");
  eq(W.eval('curSlide().elements.find(e=>e.role==="opr-risk-body").text'), "• Risco editado");
});

t("Next Steps abre selecionado na Apresentação e as células são editáveis", () => {
  aba("opr"); click(q('[data-opr="presentation"]'));
  eq(W.eval("tab"), "apresentacao");
  eq(W.eval("selectedElement().role"), "opr-next-steps");
  const cell = q('#stage [data-table-cell="1:0"]');
  ok(!!cell, "célula da tabela não apareceu no palco");
  cell.value = "Entrega pela apresentação"; input(cell);
  eq(W.eval("selectedElement().rows[1][0]"), "Entrega pela apresentação");
  aba("opr");
});

t("atualizar Next Steps recompõe as linhas a partir das atividades", () => {
  W.eval('P.activities.find(a=>a.component_id===curSlide().opr_component_id).name="Atividade atualizada"');
  respostaConfirm = true; click(q('[data-opr="next-reset"]'));
  eq(W.eval('curSlide().elements.find(e=>e.role==="opr-next-steps").rows[1][0]'), "Atividade atualizada");
});

t("faixa compacta desenha no palco e troca de variante pelo inspetor", () => {
  aba("opr");
  const svg = q("#stage").innerHTML;
  ok(svg.includes("<svg"), "o cronograma não entrou na área superior");
  const id = W.eval(`curSlide().elements.find(e=>e.role==="opr-chart").id`);
  eq(W.eval(`chartVariant(curSlide().elements.find(e=>e.role==="opr-chart"))`), "compact");
  aba("apresentacao");
  W.eval(`selEl=${JSON.stringify(id)};render()`);
  qa("details.sec").forEach(x => x.open = true);
  const sel = q('[data-el-f="variant"]');
  ok(!!sel, "inspetor do gráfico não oferece o desenho");
  sel.value = "full"; input(sel);
  eq(W.eval("selectedElement().variant"), undefined, "variante padrão deveria ser apagada, não gravada:");
  sel.value = "compact"; input(sel);
  eq(W.eval("selectedElement().variant"), "compact");
  aba("opr");
});

t("semáforo geral também é editável como elemento solto na Apresentação", () => {
  aba("apresentacao");
  const risco = W.eval(`curSlide().elements.find(e=>e.role==="opr-status").id`);
  W.eval(`selEl=${JSON.stringify(risco)};render()`);
  qa("details.sec").forEach(x => x.open = true);
  const casas = q('[data-el-f="slots"]');
  ok(!!casas, "inspetor do semáforo não apareceu");
  casas.value = "4"; input(casas);
  eq(W.eval("selectedElement().slots"), 4);
  aba("opr");
});

t("texto personalizável pode ser editado diretamente no palco do OPR", () => {
  aba("opr");
  const id = W.eval(`curSlide().elements.find(e=>e.role==="opr-scope-body").id`);
  const direct = q(`[data-el="${id}"][data-inline-text]`);
  ok(!!direct, "texto direto não foi exposto como editável");
  direct.dispatchEvent(new W.MouseEvent("mousedown", { bubbles:true, button:0 }));
  direct.focus(); W.dispatchEvent(new W.MouseEvent("mouseup", { bubbles:true }));
  ok(q("#textFormatPop").classList.contains("on"), "popup de formatação não abriu");
  ok(!!q('[data-tff="font"]') && !!q('[data-tf="underline"]') && !!q('[data-tf^="align:"]'),
    "popup não expôs os controles de tipografia");
  direct.textContent = "• Escopo direto\n• Segunda linha"; input(direct);
  eq(W.eval(`curSlide().elements.find(e=>e.id==="${id}").text`), "• Escopo direto\n• Segunda linha");
  eq(q('[data-opr-f="scope"]').value, "• Escopo direto\n• Segunda linha");
  ok(W.eval("dirty"), "edição direta não marcou o projeto como alterado");
});

t("popup formata fonte, tamanho, cor, sublinhado e centralização", () => {
  const id = W.eval(`curSlide().elements.find(e=>e.role==="opr-scope-body").id`);
  const direct = q(`[data-el="${id}"][data-inline-text]`);
  direct.dispatchEvent(new W.MouseEvent("mousedown", { bubbles:true, button:0 }));
  W.dispatchEvent(new W.MouseEvent("mouseup", { bubbles:true }));
  const size = q('[data-tff="size"]'); size.value = "22"; input(size);
  const font = q('[data-tff="font"]'); font.value = "Arial"; input(font);
  const color = q('[data-tff="color"]'); color.value = "#123456"; input(color);
  click(q('[data-tf="underline"]'));
  click(q('[data-tf="align:ctr"]'));
  eq(W.eval(`(()=>{const e=curSlide().elements.find(e=>e.id==="${id}");return [e.size,e.font,e.color,e.underline,e.align]})()`),
    [22, "Arial", "#123456", true, "ctr"]);
  ok(q(`[data-el="${id}"]`).style.fontFamily.includes("Arial"), "fonte não apareceu no palco");
});

t("OPR permite escolher, selecionar e remover imagem livre", () => {
  aba("opr");
  let abriuSeletor = false;
  const originalClick = W.HTMLInputElement.prototype.click;
  W.HTMLInputElement.prototype.click = function() { if (this.type === "file" && this.accept === "image/*") abriuSeletor = true; };
  click(q('[data-opr="image"]'));
  W.HTMLInputElement.prototype.click = originalClick;
  ok(abriuSeletor, "ação de imagem não abriu o seletor de arquivo");
  W.eval(`(()=>{const s=curOPR(),e={id:"img-opr-test",type:"image",x:120,y:120,w:200,h:100,z:s.elements.length,src:"data:image/png;base64,"};s.elements.push(e);selEl=e.id;render();})()`);
  ok(!!q('[data-el="img-opr-test"] img'), "imagem livre não apareceu no palco");
  ok(!!q('[data-opr="image-replace"]'), "ação de troca da imagem selecionada ausente");
  click(q('[data-opr="image-remove"]'));
  eq(W.eval(`curOPR().elements.some(e=>e.id==="img-opr-test")`), false);
});

group("Projetos e salvamento");
t("novo projeto entra no seletor sem descartar o anterior", () => {
  const antes = qa("#projSel option").length;
  click(q('[data-act="proj-new"]'));
  eq(qa("#projSel option").length, antes + 1);
});
t("alternar projeto preserva o que foi editado", () => {
  const ids = qa("#projSel option").map(o => o.value);
  W.eval(`setActive("${ids[0]}"); P.project.name = "Projeto A editado";`);
  W.eval(`setActive("${ids[1]}");`);
  W.eval(`setActive("${ids[0]}");`);
  eq(W.eval("P.project.name"), "Projeto A editado");
});
await (async () => {
  click(q('[data-act="save"]')); await espera(60);
  t("salvar grava no destino escolhido", () => eq(escritas, 1));
  t("primeiro salvamento alterado cria uma versão", () => eq(W.eval("P.version_history.length"), 1));
  W.eval('P.project.name="Alterado"; markDirty();');
  click(q('[data-act="save"]')); await espera(60);
  t("salvar de novo reusa o mesmo arquivo", () => eq(escritas, 2));
  t("versão registra o campo modificado", () => {
    eq(W.eval("P.version_history.length"), 2);
    ok(W.eval("P.version_history.at(-1).changes.some(x=>x.path==='project.name'&&x.action==='changed')"));
  });
  click(q('[data-act="autosave"]')); await espera(60);
  t("automático liga e aparece na barra", () => {
    ok(/Auto: \d+ min/.test(q("#autoBtn").textContent));
    ok(q("#fileHint").textContent.includes("auto"));
  });
  mtime += 5000; respostaConfirm = false;
  W.eval('P.project.name="Conflito"; markDirty();');
  click(q('[data-act="save"]')); await espera(60);
  t("arquivo alterado por terceiros bloqueia a gravação", () => {
    ok(/alterado fora daqui/.test(ultimoConfirm), "não perguntou");
    eq(escritas, 2, "gravou mesmo com recusa:");
    eq(W.eval("P.version_history.length"), 2, "criou versão para salvamento cancelado:");
    eq(q("#autoBtn").textContent, "Auto: off", "automático seguiu ligado:");
  });
  respostaConfirm = true;
  click(q('[data-act="save"]')); await espera(60);
  t("confirmar sobrescreve", () => { eq(escritas, 3); eq(W.eval("P.version_history.length"), 3); });
})();

group("Histórico de versões");
t("fica disponível dentro da Visão geral", () => {
  aba("home"); click(q('[data-home-view="history"]'));
  eq(qa(".history-entry").length, 3);
  ok(q("#pane").textContent.includes("project.name"), "campo alterado não apareceu no histórico");
});

group("Validação");
t("erro no documento bloqueia a exportação", () => {
  W.eval('P.activities[0].end="2020-01-01"; render();');
  ok(q(".iss.e"), "não listou erro");
  click(q('[data-act="png"]'));
  ok(qa(".toast").some(x => /Corrija os erros/.test(x.textContent)), "exportou com erro");
});

t("nenhum erro de execução ao final", () => eq([...new Set(erros)], []));
W.eval("setAuto(false)");
dom.window.close();
report();
