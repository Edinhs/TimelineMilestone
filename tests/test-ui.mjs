/* Testes de interface: carrega o app inteiro em jsdom e exerce os caminhos
   que só quebram em tempo de execução (SPEC-003 §4d). */
import { JSDOM } from "jsdom";
import fs from "node:fs";
import { t, eq, ok, group, report } from "./harness.mjs";
import { APP } from "./harness.mjs";

const erros = [];
let escritas = 0, mtime = 1000, permissao = "granted";
let ultimoConfirm = "", respostaConfirm = true;

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
t("desenha o cronograma no palco", () => ok((q("#paper").innerHTML || "").length > 1000));
t("faixa de indicadores é preenchida", () => ok(qa(".kpi").length >= 5));

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

group("Abas e seções");
t("todas as abas renderizam sem erro", () => {
  ["home", "apresentacao", "projeto", "milestone", "timeline"].forEach(n => {
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
  eq(qa("[data-slide]").length, 6);
  ok(!!q("#stage"), "palco não montou");
  ok(q("#dims").textContent.includes("960"), "palco não é 16:9");
});
t("capa é travada", () => {
  const el = q("#stage [data-el]");
  el.dispatchEvent(new W.MouseEvent("mousedown", { bubbles:true, clientX:100, clientY:100 }));
  ok(/Capa padrão Stellantis/.test(q("#pane").innerHTML), "inspetor não avisou");
  ok(!q("#stage .rsz"), "elemento travado tem alça de resize");
});
t("elemento livre arrasta", () => {
  click(qa("[data-slide]")[2]);
  const el = q("#stage [data-el]");
  const id = el.dataset.el;
  const antes = W.eval(`(()=>{const s=curSlide();const e=s.elements.find(x=>x.id==="${id}");return [e.x,e.y];})()`);
  el.dispatchEvent(new W.MouseEvent("mousedown", { bubbles:true, clientX:200, clientY:200 }));
  W.dispatchEvent(new W.MouseEvent("mousemove", { bubbles:true, clientX:280, clientY:260 }));
  W.dispatchEvent(new W.MouseEvent("mouseup", { bubbles:true }));
  const depois = W.eval(`(()=>{const s=curSlide();const e=s.elements.find(x=>x.id==="${id}");return [e.x,e.y];})()`);
  ok(antes[0] !== depois[0] || antes[1] !== depois[1], "não moveu");
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
  W.eval('P.project.name="Alterado"; markDirty();');
  click(q('[data-act="save"]')); await espera(60);
  t("salvar de novo reusa o mesmo arquivo", () => eq(escritas, 2));
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
    eq(q("#autoBtn").textContent, "Auto: off", "automático seguiu ligado:");
  });
  respostaConfirm = true;
  click(q('[data-act="save"]')); await espera(60);
  t("confirmar sobrescreve", () => eq(escritas, 3));
})();

group("Validação");
t("erro no documento bloqueia a exportação", () => {
  W.eval('P.activities[0].end="2020-01-01"; render();');
  ok(q(".iss.e"), "não listou erro");
  click(q('[data-act="png"]'));
  ok(qa(".toast").some(x => /Corrija os erros/.test(x.textContent)), "exportou com erro");
});

t("nenhum erro de execução ao final", () => eq([...new Set(erros)], []));
report();
