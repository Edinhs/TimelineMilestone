/* Testes do núcleo: domínio, render, auditoria, legenda e exportações.
   Roda sem navegador — ver SPEC-001 §7, SPEC-002 §8, SPEC-004 §6, SPEC-006 §5, SPEC-007 §8. */
import { loadEngine, t, eq, ok, group, report } from "./harness.mjs";
import fs from "node:fs";
const { api: A, SAMPLE, setP } = await loadEngine();
const clone = o => JSON.parse(JSON.stringify(o));

group("SPEC-001 — domínio e cálculos");
t("semanas e meses conferem com o rótulo do arquivo de referência", () => {
  eq(A.weeks("2026-09-07", "2027-10-04"), 56, "Mechanical + tooling:");
  eq(A.months("2026-09-07", "2027-10-04"), 12);
});
t("duração mínima é 1, nunca 0 nem negativa", () => {
  eq(A.weeks("2026-01-01", "2026-01-02"), 1);
  eq(A.months("2026-01-01", "2026-01-02"), 1);
});
t("fixture de referência não tem erro nem aviso", () => eq(A.validate(SAMPLE).length, 0));
t("E001 pega fim antes do início", () => {
  const p = clone(SAMPLE); p.activities[0].end = "2020-01-01";
  ok(A.validate(p).some(i => i.code === "E001"));
});
t("E005 pega sobreposição na mesma lane", () => {
  const p = clone(SAMPLE);
  p.activities.push({ id:"x", component_id:"c1", name:"Choque", start:"2027-01-01", end:"2027-06-01", status:"ontime", lane:0, markers:[] });
  ok(A.validate(p).some(i => i.code === "E005"));
});
t("E003 pega atividade órfã", () => {
  const p = clone(SAMPLE); p.activities[0].component_id = "inexistente";
  ok(A.validate(p).some(i => i.code === "E003"));
});
t("W102 pega marcador fora da barra", () => {
  const p = clone(SAMPLE); p.activities[0].markers = [{ label:"X", date:"2020-01-01" }];
  ok(A.validate(p).some(i => i.code === "W102"));
});
t("marcador novo nasce no meio da atividade", () => {
  const a = { start:"2025-11-03", end:"2026-08-24" };
  eq(A.midOf(a), "2026-03-30");
});
t("lanes nunca se sobrepõem no layout resolvido", () => {
  A.computeLayout(SAMPLE).forEach(g => {
    const porLane = {};
    g.acts.forEach(a => (porLane[a.lane || 0] = porLane[a.lane || 0] || []).push(a));
    Object.values(porLane).forEach(list => {
      const s = [...list].sort((x, y) => x.start.localeCompare(y.start));
      for (let i = 1; i < s.length; i++) ok(s[i].start >= s[i - 1].end, "lane sobreposta");
    });
  });
});
t("histórico identifica campos por id e ignora o próprio histórico", () => {
  const before = clone(SAMPLE), after = clone(SAMPLE);
  after.activities[0].end = "2027-11-01";
  after.version_history = [{ id:"v1", version:1, saved_at:"2026-08-26T12:00:00.000Z", changes:[] }];
  const changes = A.diffProjectVersions(A.historySnapshot(before), A.historySnapshot(after));
  eq(changes.length, 1);
  eq([changes[0].path, changes[0].action], [`activities[${after.activities[0].id}].end`, "changed"]);
});

group("SPEC-002 — render");
t("display list é determinístico", () => eq(A.toSVG(A.buildDisplayList(SAMPLE)), A.toSVG(A.buildDisplayList(SAMPLE))));
t("dimensões da fixture batem com a referência", () => {
  const d = A.buildDisplayList(SAMPLE);
  eq([d.width, d.height], [1296, 348]);
});
t("modelo mensal continua sendo o padrão compatível", () => {
  const p = clone(SAMPLE); delete p.project.axis_mode;
  const svg = A.toSVG(A.buildDisplayList(p));
  ok(svg.includes(">2025<") && svg.includes(">Mai<"), "cabeçalho Ano > Mês ausente");
  ok(!svg.includes("Week31"), "modo semanal ativado sem solicitação");
});
t("modelo semanal agrupa Week31 e Week32 dentro de mês e ano", () => {
  const p = clone(SAMPLE);
  p.project.axis_mode = "week";
  p.project.chart_start = "2026-07-27";
  p.project.chart_end = "2026-08-16";
  const weekly = A.buildDisplayList(p), svg = A.toSVG(weekly);
  ok(svg.includes(">Week31<") && svg.includes(">Week32<"), "semanas ISO não renderizadas");
  ok(svg.includes(">Jul/2026<") && svg.includes(">Ago/2026<"), "agrupamento Mês/Ano ausente");
  const monthly = clone(p); monthly.project.axis_mode = "month";
  ok(weekly.width > A.buildDisplayList(monthly).width, "modelo semanal não ganhou espaço legível");
  const turn = clone(p);
  turn.project.chart_start = "2020-12-28";
  turn.project.chart_end = "2021-01-10";
  const turnSvg = A.toSVG(A.buildDisplayList(turn));
  ok(turnSvg.includes(">Week53<") && turnSvg.includes(">Week1<"), "virada do ano ISO incorreta");
  ok(turnSvg.includes(">Dez/2020<") && turnSvg.includes(">Jan/2021<"), "contexto de mês/ano incorreto");
});
t("nenhuma coordenada inválida", () => {
  /* o base64 da logo contém "NaN" por acaso — procurar a string crua daria falso
     positivo. O que importa é número não finito nas primitivas e no SVG já limpo. */
  A.buildDisplayList(SAMPLE).prims.forEach(p => Object.entries(p).forEach(([k, v]) => {
    if (typeof v === "number") ok(Number.isFinite(v), `${p.k}.${k} = ${v}`);
  }));
  const svg = A.toSVG(A.buildDisplayList(SAMPLE)).replace(/base64,[^"]*/g, "base64,…");
  ok(!svg.includes("NaN") && !svg.includes("undefined"));
});
t("nada é desenhado à esquerda da origem", () => {
  A.buildDisplayList(SAMPLE).prims.forEach(p => {
    const x = p.x !== undefined ? p.x : p.x1;
    if (x !== undefined) ok(x >= -1, "primitiva fora da folha: " + JSON.stringify(p).slice(0, 60));
  });
});
t("dimensões personalizadas mudam o tamanho", () => {
  const p = clone(SAMPLE); p.project.layout = { month_w:38, row_h:24, bar_h:16, panel_w:200, band_h:140, font_scale:1.3 };
  const d = A.buildDisplayList(p);
  ok(d.width > 1900 && d.height > 430, `${d.width}x${d.height}`);
});
t("valor fora da faixa é fixado, não rejeitado", () => {
  const p = clone(SAMPLE); p.project.layout = { month_w:999, row_h:10, bar_h:30 };
  const tk = A.resolveTokens(p);
  eq(tk.MONTH_W, 72); eq(tk.BAR_H, 8, "barra cabe na linha:");
});
t("barras carregam id para o clique no gráfico", () => {
  const svg = A.toSVG(A.buildDisplayList(SAMPLE));
  eq((svg.match(/data-aid=/g) || []).length, SAMPLE.activities.length);
});
t("marcadores individuais exibem rótulo e data", () => {
  const svg = A.toSVG(A.buildDisplayList(SAMPLE));
  ok(svg.includes(">OT Parts<") && svg.includes(">03/Mai/2027<"), "data do marcador ausente");
});
t("componente e milestone ocultos somem apenas do desenho", () => {
  const p = clone(SAMPLE), c = p.components[0], m = p.milestones.find(x => x.id === "X0");
  const hiddenActs = p.activities.filter(a => a.component_id === c.id).length;
  c.hidden = true; m.hidden = true;
  const svg = A.toSVG(A.buildDisplayList(p));
  eq(A.computeLayout(p).length, SAMPLE.components.length - 1);
  eq((svg.match(/data-aid=/g) || []).length, SAMPLE.activities.length - hiddenActs);
  ok(!svg.includes(">X0<"), "milestone oculto ainda foi desenhado");
  eq(p.activities.filter(a => a.component_id === c.id).length, hiddenActs, "dados das atividades foram removidos:");
});

group("ADR-005 — legenda editável");
t("padrão vem em inglês", () => {
  eq(A.legendTitle(SAMPLE), "Components");
  eq(A.resolveStatuses(SAMPLE).ontime.label, "Ontime");
});
t("rótulo e cor personalizados chegam ao desenho", () => {
  const p = clone(SAMPLE);
  p.project.legend = { title:"Situação", statuses:{ ontime:{ label:"No prazo", fill:"#FFD6D6" } } };
  const svg = A.toSVG(A.buildDisplayList(p));
  ok(svg.includes("No prazo") && svg.includes("Situação") && svg.includes("#FFD6D6"));
});
t("cor inválida cai no padrão em silêncio", () => {
  const p = clone(SAMPLE);
  p.project.legend = { statuses:{ ontime:{ fill:"azul", stroke:"#GGGGGG", label:"  " } } };
  const r = A.resolveStatuses(p);
  eq([r.ontime.fill, r.ontime.stroke, r.ontime.label], ["#B4C7E7", "#243782", "Ontime"]);
});
t("status oculto some da legenda mas mantém as barras", () => {
  const p = clone(SAMPLE);
  p.project.legend = { statuses:{ ontime:{ hidden:true } } };
  const svg = A.toSVG(A.buildDisplayList(p));
  ok(!svg.includes(">Ontime<"), "rótulo saiu da legenda");
  eq((svg.match(/data-aid=/g) || []).length, SAMPLE.activities.length);
});

group("SPEC-006 — auditoria");
t("auditProgram não muta o documento", () => {
  const antes = JSON.stringify(SAMPLE); A.auditProgram(SAMPLE); eq(JSON.stringify(SAMPLE), antes);
});
t("crossing do X0 confere com a contagem manual", () => {
  const x0 = SAMPLE.milestones.find(m => m.id === "X0");
  const manual = SAMPLE.activities.filter(a => a.start <= x0.date && x0.date <= a.end).length;
  eq(A.auditProgram(SAMPLE).gates.find(g => g.id === "X0").crossing, manual);
});
t("todos os códigos A2xx disparam quando devem", () => {
  const p = clone(SAMPLE);
  p.project.today = "2027-10-01";
  p.activities.push({ id:"aX", component_id:"c4", name:"Pós-SOP", start:"2028-12-01", end:"2029-02-01", status:"ontime", lane:1, markers:[] });
  const codes = [...new Set(A.auditProgram(p).findings.map(f => f.code))].sort();
  eq(codes, ["A201", "A202", "A203", "A204", "A205"]);
});
t("documento saudável não gera achado", () => {
  const p = clone(SAMPLE);
  p.components.forEach(c => c.supplier = c.supplier || "Fornecedor Z");
  p.activities.forEach(a => { if (a.status === "delayed" || a.status === "concluded_delay") a.status = "ontime"; });
  eq(A.auditProgram(p).findings.length, 0);
});
t("KPIs trazem o próximo marco e o atraso", () => {
  const k = A.computeKPIs(SAMPLE);
  eq(k.next.label, "SFM"); eq(k.late, 3); eq(k.total, 10);
});
t("Visão geral explica o status e monta prioridades acionáveis", () => {
  const o = A.computeOverview(SAMPLE);
  eq(o.status, "Atenção");
  ok(o.priorities.some(x => x.jump.startsWith("late:")), "atraso não virou prioridade");
  eq(o.visibleComponents, SAMPLE.components.length);
});
t("erro de validação torna o status crítico", () => {
  const p = clone(SAMPLE); p.activities[0].end = "2020-01-01";
  const o = A.computeOverview(p);
  eq([o.status, o.tone], ["Crítico", "critical"]);
  ok(o.priorities.some(x => x.title === "Corrigir validação"));
});

group("SPEC-004 — interoperabilidade");
t("round-trip pelo layout legado preserva tudo", () => {
  const vazio = { schema_version:"1.6", project:{ name:"x", chart_start:"2025-01-01", chart_end:"2029-06-01", duration_unit:"W" },
    milestones:[], groups:[], components:[], activities:[] };
  const r = A.parseBlock(A.toTSV(A.TL_COLS, A.toLegacyTimeline(SAMPLE)), vazio);
  eq(r.added, SAMPLE.activities.length);
  eq(vazio.activities.reduce((n, a) => n + (a.markers || []).length, 0),
     SAMPLE.activities.reduce((n, a) => n + (a.markers || []).length, 0));
  eq(vazio.components.map(c => c.supplier || "").filter(Boolean).length, 4, "fornecedores:");
  eq(A.validate(vazio).length, 0);
});
t("marcos voltam do layout legado", () => {
  const p = { schema_version:"1.6", project:{ name:"x", chart_start:"2025-01-01", chart_end:"2029-06-01" },
    milestones:[], groups:[], components:[], activities:[] };
  A.parseBlock(A.toTSV(A.MS_COLS, A.toLegacyMilestones(SAMPLE)), p);
  eq(p.milestones.length, SAMPLE.milestones.length);
});
t("marcador sem data entra centralizado", () => {
  const p = { schema_version:"1.6", project:{ name:"x", chart_start:"2025-01-01", chart_end:"2029-01-01" },
    milestones:[], groups:[], components:[], activities:[] };
  A.parseBlock("Component\tDescription\tInitial Date\tFinal Date\tMilestone Individual\tMilestone\n" +
    "Cluster\tSourcing\t2025-11-03\t2026-08-24\tOT Parts\t\n", p);
  eq(p.activities[0].markers[0].date, A.midOf(p.activities[0]));
});
t("rótulo de status personalizado volta para a chave certa", () => {
  const p = clone(SAMPLE);
  p.project.legend = { statuses:{ delayed:{ label:"Atrasado" }, ontime:{ label:"No prazo" } } };
  const alvo = { schema_version:"1.6", project:clone(p.project), milestones:[], groups:[], components:[], activities:[] };
  A.parseBlock(A.toTSV(A.TL_COLS, A.toLegacyTimeline(p)), alvo);
  eq([...new Set(alvo.activities.map(a => a.status))].sort(),
     [...new Set(SAMPLE.activities.map(a => a.status))].sort());
});

group("Exportações");
const dl = A.buildDisplayList(SAMPLE);
t("PDF é um arquivo válido nos três tamanhos", () => {
  ["fit", "a3l", "a4l"].forEach(k => {
    const b = A.buildPDF(SAMPLE, dl, k);
    const head = Buffer.from(b.slice(0, 8)).toString("latin1");
    ok(head.startsWith("%PDF-1."), k + ": cabeçalho");
    ok(Buffer.from(b).toString("latin1").includes("%%EOF"), k + ": fim de arquivo");
  });
});
t("PDF personalizado respeita a medida em mm", () => {
  const MM = 72 / 25.4;
  const txt = Buffer.from(A.buildPDF(SAMPLE, dl, { w:600 * MM, h:200 * MM })).toString("latin1");
  ok(txt.includes("/MediaBox [0 0 1700.79 566.93]"), "MediaBox: " + (txt.match(/MediaBox[^\]]+\]/) || [""])[0]);
});
t("XLSX é um zip com as quatro abas", () => {
  const b = A.buildXlsx(SAMPLE, null, dl.width, dl.height);
  const s = Buffer.from(b).toString("latin1");
  eq(Buffer.from(b.slice(0, 2)).toString("latin1"), "PK");
  ["sheet1.xml", "sheet2.xml", "sheet3.xml", "sheet4.xml"].forEach(n => ok(s.includes(n), n));
  ok(s.includes("Auditoria") && s.includes("Input Timeline"));
});
t("PPTX sai válido mesmo sem deck", () => {
  const b = A.buildPPTX(SAMPLE, new Map());
  const s = Buffer.from(b).toString("latin1");
  eq(Buffer.from(b.slice(0, 2)).toString("latin1"), "PK");
  ok(s.includes("ppt/presentation.xml") && s.includes("slideMaster1.xml"));
});
t("PPTX não muta o deck nem conserva relacionamento de mídia antigo", () => {
  const p = clone(SAMPLE);
  p.project.deck = { slides:[{ id:"s1", layout:"blank", elements:[
    { id:"img1", type:"image", x:10, y:20, w:100, h:80, src:"data:image/png;base64," }
  ] }] };
  const before = JSON.stringify(p.project.deck);
  const withMedia = Buffer.from(A.buildPPTX(p, new Map([["img1", new Uint8Array([137, 80, 78, 71])]]))).toString("latin1");
  ok(withMedia.includes('r:embed="rId2"'), "imagem não recebeu relacionamento");
  eq(JSON.stringify(p.project.deck), before);
  const withoutMedia = Buffer.from(A.buildPPTX(p, new Map())).toString("latin1");
  ok(!withoutMedia.includes('r:embed="rId2"'), "relacionamento antigo permaneceu");
  ok(!("_rid" in p.project.deck.slides[0].elements[0]), "estado interno vazou no deck");
});
t("PPTX declara JPEG pela assinatura real da mídia", () => {
  const p = clone(SAMPLE);
  p.project.deck = { slides:[{ id:"s1", layout:"blank", elements:[
    { id:"photo", type:"image", x:10, y:20, w:100, h:80, src:"data:image/jpeg;base64,/9j/" }
  ] }] };
  const bytes = A.buildPPTX(p, new Map([["photo", new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])]]));
  const packageText = Buffer.from(bytes).toString("latin1");
  ok(packageText.includes("ppt/media/image1.jpeg"), "mídia não recebeu extensão JPEG");
  ok(packageText.includes('Extension="jpeg" ContentType="image/jpeg"'), "MIME JPEG ausente");
});
t("deck gerado contém somente capa corporativa e cronograma", () => {
  const p = clone(SAMPLE); setP(p); A.generateDeck();
  const d = p.project.deck;
  eq(d.slides.length, 2);
  eq(d.slides.map(s => s.title), ["Capa", "Cronograma do programa"]);
  eq(d.slides[0].layout, "cover");
  ok(d.slides[0].elements.every(e => e.locked), "toda a capa travada");
  const cap = d.slides[0], photo = cap.elements.find(e => e.role === "cover-photo");
  eq([photo.x, photo.y, photo.w, photo.h], [0, 0, A.STAGE_W, A.STAGE_H]);
  ok(photo.src.startsWith("data:image/jpeg;base64,"), "fundo corporativo não foi incorporado");
  eq(cap.elements.filter(e => /cover-logo/.test(e.role || "")).length, 2);
  eq(cap.elements.find(e => e.role === "cover-title").text, `${SAMPLE.project.name} – Project status`);
  ok(d.slides[1].elements.some(e => e.type === "chart"), "cronograma ausente");
});
t("capa: reaplicar restaura a geometria sem apagar o texto", () => {
  const p = clone(SAMPLE); setP(p); A.generateDeck();
  const cap = p.project.deck.slides[0];
  const tit = cap.elements.find(e => e.role === "cover-title");
  const photo = cap.elements.find(e => e.role === "cover-photo");
  photo.src = "data:image/jpeg;base64,/9j/";
  tit.text = "281 MY28 MOVER"; tit.x = 500; tit.size = 99;
  A.applyLayout(cap);
  const t2 = cap.elements.find(e => e.role === "cover-title");
  eq([t2.text, t2.x, t2.size], ["281 MY28 MOVER", A.COVER.title.x, A.COVER.title.size]);
  eq(cap.elements.find(e => e.role === "cover-photo").src, "data:image/jpeg;base64,/9j/");
});
t("posições do slide convertem para EMU sem deriva", () => {
  eq(A.STAGE_W * A.EMU_PX, 12192000);
  eq(A.STAGE_H * A.EMU_PX, 6858000);
});

group("Modelos de apresentação");
t("round-trip remapeia IDs, restaura a capa e preserva o projeto", () => {
  const p = clone(SAMPLE); setP(p); A.generateDeck();
  p.project.deck._transient = "não exportar";
  const template = A.buildDeckTemplate("Revisão executiva", "Deck 16:9", "2026-08-26T12:00:00.000Z");
  eq([template.template_version, template.kind], ["1.0", "timeline-studio-deck-template"]);
  ok(!("_transient" in template.deck), "estado transitório vazou");
  const oldIds = template.deck.slides.flatMap(s => [s.id, ...s.elements.map(e => e.id)]);
  const outside = JSON.stringify({ name:p.project.name, activities:p.activities, milestones:p.milestones });
  template.deck.slides[0].elements.find(e => e.role === "cover-title").x = 700;
  A.applyDeckTemplate(template);
  const newIds = p.project.deck.slides.flatMap(s => [s.id, ...s.elements.map(e => e.id)]);
  ok(newIds.every(id => !oldIds.includes(id)), "IDs foram reaproveitados");
  eq(new Set(newIds).size, newIds.length, "IDs novos não são únicos");
  ok(p.project.deck.slides[0].elements.every(e => e.locked), "capa perdeu travas");
  eq(p.project.deck.slides[0].elements.find(e => e.role === "cover-title").x, A.COVER.title.x);
  eq(JSON.stringify({ name:p.project.name, activities:p.activities, milestones:p.milestones }), outside);
});
t("validação rejeita envelope, estrutura e imagem perigosos", () => {
  const p = clone(SAMPLE); setP(p); A.generateDeck();
  const good = A.buildDeckTemplate("Modelo", "Descrição", "2026-08-26T12:00:00.000Z");
  const rejects = [
    Object.assign(clone(good), { kind:"outro" }),
    Object.assign(clone(good), { deck:{ slides:[] } }),
    (() => { const x = clone(good); x.deck.slides[1].elements.push({ id:"x", type:"image", x:0, y:0, w:20, h:20, src:"https://example.com/a.png" }); return x; })(),
    (() => { const x = clone(good); x.deck.theme = { font:'Arial" onload="alert(1)' }; return x; })(),
    (() => { const x = clone(good); x.deck.slides[1].elements[1].id = x.deck.slides[1].elements[0].id; return x; })()
  ];
  rejects.forEach(value => {
    let failed = false;
    try { A.validateDeckTemplate(value); } catch (error) { failed = true; }
    ok(failed, "modelo inválido foi aceito");
  });
});
t("deck de projeto vazio é aceito e conteúdo externo é rejeitado", () => {
  eq(A.validateProjectDeck({ theme:{ font:"Segoe UI" }, slides:[] }).slides, []);
  const bad = { slides:[{ id:"s1", layout:"blank", elements:[
    { id:"e1", type:"image", x:0, y:0, w:100, h:80, src:"https://example.com/photo.jpg" }
  ] }] };
  let failed = false;
  try { A.validateProjectDeck(bad); } catch (error) { failed = true; }
  ok(failed, "imagem externa de projeto foi aceita");
});
t("modelo reaplicado continua exportável como PPTX", () => {
  const p = clone(SAMPLE); setP(p); A.generateDeck();
  const template = A.buildDeckTemplate("Modelo", "Descrição", "2026-08-26T12:00:00.000Z");
  A.applyDeckTemplate(template);
  const bytes = A.buildPPTX(p, new Map()), packageText = Buffer.from(bytes).toString("latin1");
  eq(Buffer.from(bytes.slice(0, 2)).toString("latin1"), "PK");
  ok(packageText.includes("ppt/slides/slide2.xml"), "pacote não contém capa e cronograma");
  ok(!packageText.includes("ppt/slides/slide3.xml"), "pacote contém slides removidos");
  ok(packageText.includes("Cronograma do programa"), "título do cronograma não chegou ao OOXML");
});

group("SPEC-008 — slide OPR");
const oprSlide = p => { const s = { id:"opr1", layout:"opr", title:"IPC J3U [Fornecedor]", elements:[] };
  (p.project.deck = p.project.deck || { slides:[] }).slides = [s]; A.buildOPR(s); return s; };

t("composição nasce com cronograma e Next Steps, dentro do teto de 40 elementos", () => {
  const p = clone(SAMPLE); setP(p);
  const s = oprSlide(p), table = s.elements.find(e => e.role === "opr-next-steps");
  ok(s.elements.length <= 40, "estourou o limite de elementos do contrato");
  ok(s.elements.some(e => e.role === "opr-chart" && e.type === "chart"), "cronograma ausente");
  eq(table.rows[0], ["Next Steps", "Start Date", "Close Date", "Lead Name"]);
  eq([table.x, table.y, table.w, table.h], [A.OPR.tableFull.x, A.OPR.tableFull.y, A.OPR.tableFull.w, A.OPR.tableFull.h]);
  ok(s.elements.find(e => e.role === "opr-scope-body").hidden, "contexto deveria nascer opcional/desativado");
});

t("faixa, logo e caixas estruturais são travados; conteúdo continua editável", () => {
  const p = clone(SAMPLE); setP(p);
  const s = oprSlide(p);
  ["opr-band", "opr-title", "opr-logo", "opr-conf", "opr-scope-box", "opr-risk-box"].forEach(role =>
    ok(s.elements.find(e => e.role === role).locked, role + " deveria ser travado"));
  ok(!s.elements.find(e => e.role === "opr-next-steps").locked, "tabela não pode nascer travada");
  ok(!s.elements.find(e => e.role === "opr-scope-body").locked, "texto de Scope deve ser editável");
});

t("Next Steps nasce das atividades do componente e usa a data curta da referência", () => {
  const p = clone(SAMPLE); setP(p);
  const s = { id:"opr-c3", layout:"opr", title:"Cluster", opr_component_id:"c3", elements:[] };
  p.project.deck = { slides:[s] }; A.buildOPR(s);
  const rows = s.elements.find(e => e.role === "opr-next-steps").rows;
  eq(rows[1], ["Sourcing", "03-Nov-25", "24-Aug-26", "Fornecedor Beta"]);
  ok(rows.slice(1).every(row => !row[0] || p.activities.some(a => a.component_id === "c3" && a.name === row[0])),
    "tabela trouxe atividade de outro componente");
});

t("ativar contexto divide a base e desativar não apaga textos", () => {
  const p = clone(SAMPLE); setP(p);
  const s = oprSlide(p);
  A.buildOPR(s, { context:true });
  const scope = s.elements.find(e => e.role === "opr-scope-body"), risk = s.elements.find(e => e.role === "opr-risk-body");
  scope.text = "• Escopo autoral"; risk.text = "• Risco autoral";
  eq(s.elements.find(e => e.role === "opr-next-steps").x, A.OPR.tableSplit.x);
  ok(!scope.hidden && !risk.hidden, "contexto não foi exibido");
  A.buildOPR(s, { context:false });
  eq(s.elements.find(e => e.role === "opr-next-steps").x, A.OPR.tableFull.x);
  ok(s.elements.find(e => e.role === "opr-scope-body").hidden, "contexto não foi ocultado");
  A.buildOPR(s, { context:true });
  eq([s.elements.find(e => e.role === "opr-scope-body").text,
      s.elements.find(e => e.role === "opr-risk-body").text], ["• Escopo autoral", "• Risco autoral"]);
});

t("reaplicar composição restaura geometria e preserva células e status", () => {
  const p = clone(SAMPLE); setP(p);
  const s = oprSlide(p), table = s.elements.find(e => e.role === "opr-next-steps");
  table.rows[1][0] = "Entrega editada"; table.x = 500;
  const status = s.elements.find(e => e.role === "opr-status"); status.level = 2; status.label = "PPID";
  A.buildOPR(s);
  const after = s.elements.find(e => e.role === "opr-next-steps"), st = s.elements.find(e => e.role === "opr-status");
  eq([after.rows[1][0], after.x], ["Entrega editada", A.OPR.tableFull.x]);
  eq([st.level, st.label], [2, "PPID"]);
});

t("elemento livre sobrevive à recomposição", () => {
  const p = clone(SAMPLE); setP(p);
  const s = oprSlide(p);
  s.elements.push({ id:"livre1", type:"image", x:600, y:300, w:100, h:60, src:"" });
  A.buildOPR(s);
  ok(s.elements.some(e => e.id === "livre1"), "ilustração do usuário foi apagada");
});

t("colunas do Next Steps seguem proporção executiva e tabelas comuns ficam iguais", () => {
  eq(A.tableColumnFractions({ role:"opr-next-steps" }, 4), [0.53, 0.15, 0.15, 0.17]);
  eq(A.tableColumnFractions({}, 3), [1 / 3, 1 / 3, 1 / 3]);
});

t("tabela cinza, grade preta e status chegam ao OOXML; contexto oculto não sai", () => {
  const p = clone(SAMPLE); setP(p);
  const s = oprSlide(p); s.elements.find(e => e.role === "opr-status").level = 2;
  const xml = Buffer.from(A.buildPPTX(p, new Map())).toString("latin1");
  ok(xml.includes("Next Steps") && xml.includes('val="B7B7B7"'), "tabela estilizada não saiu");
  ok(xml.includes('<a:lnL w="12700">') && xml.includes('val="111111"'), "grade preta não saiu");
  ok(xml.includes('val="FF0000"') && xml.includes("STATUS"), "status não saiu");
  ok(!xml.includes("Risk/Open Points"), "contexto oculto vazou para o PPTX");
});

t("formatação da caixa de contexto chega ao OOXML quando visível", () => {
  const p = clone(SAMPLE); setP(p);
  const s = oprSlide(p); A.buildOPR(s, { context:true });
  Object.assign(s.elements.find(e => e.role === "opr-scope-body"), {
    text:"Escopo técnico", font:"Arial", size:22, color:"#123456", italic:true, underline:true, align:"ctr"
  });
  const xml = Buffer.from(A.buildPPTX(p, new Map())).toString("latin1");
  ok(xml.includes('typeface="Arial"') && xml.includes('i="1"') && xml.includes('u="sng"'), "tipografia não chegou ao PPTX");
  ok(xml.includes('algn="ctr"') && xml.includes('val="123456"') && xml.includes("Escopo t"), "formatação/contexto ausente");
});

t("geometria do semáforo cabe na caixa e escala com a altura", () => {
  const g = A.statusGeom({ x:0, y:0, w:A.OPR.badge.w, h:A.OPR.badge.h, slots:3, level:0, label:"RISK" });
  ok(g.boxX + g.boxW <= A.OPR.badge.w + 0.001, "semáforo transborda a pílula");
  ok(g.labelW > 0, "não sobrou espaço para o rótulo");
  const big = A.statusGeom({ x:0, y:0, w:182, h:56, slots:3, level:0, label:"RISK" });
  eq(Math.round(big.dia / g.dia), 2, "geometria não acompanhou a altura");
});

t("nível fora das casas cai no padrão em silêncio", () => {
  eq(A.statusOf({ slots:3, level:7 }).level, 0);
  eq(A.statusOf({ slots:3, level:-1 }).level, -1);
  eq(A.statusOf({}).slots, 3);
  eq(A.statusOf({ slots:99 }).slots, 5);
  eq(A.statusOf({}).label, "RISK");
});

t("modelo aceita o slide OPR e recusa trecho inválido", () => {
  const p = clone(SAMPLE); setP(p);
  const s = oprSlide(p); A.buildOPR(s, { context:true });
  const template = A.buildDeckTemplate("OPR", "One-pager", "2026-09-09T12:00:00.000Z");
  A.applyDeckTemplate(template);
  eq(p.project.deck.slides[0].layout, "opr");
  const bad = A.buildDeckTemplate("OPR", "One-pager", "2026-09-09T12:00:00.000Z");
  bad.deck.slides[0].elements.find(e => e.role === "opr-scope-body").runs = [{ text:"x", color:"vermelho" }];
  let failed = false;
  try { A.validateDeckTemplate(bad); } catch (error) { failed = true; }
  ok(failed, "cor de trecho inválida foi aceita");
});

t("modelo preserva ocultação opcional e rejeita hidden fora de booleano", () => {
  const p = clone(SAMPLE); setP(p);
  const s = oprSlide(p), scope = s.elements.find(e => e.role === "opr-scope-body");
  ok(scope.hidden, "Scope opcional não nasceu oculto");
  const good = A.buildDeckTemplate("OPR", "Contexto opcional", "2026-09-14T12:00:00.000Z");
  eq(good.deck.slides[0].elements.find(e => e.role === "opr-scope-body").hidden, true);
  const bad = clone(good); bad.deck.slides[0].elements.find(e => e.role === "opr-scope-body").hidden = "sim";
  let failed = false;
  try { A.validateDeckTemplate(bad); } catch (error) { failed = true; }
  ok(failed, "hidden textual foi aceito");
});

t("sincronização cria um slide OPR individual para cada componente", () => {
  const p = clone(SAMPLE); p.project.deck = { slides:[] }; setP(p);
  const result = A.syncComponentOPRSlides();
  eq(result.slides.length, p.components.length);
  eq(result.created, p.components.length);
  eq(new Set(result.slides.map(s => s.opr_component_id)).size, p.components.length);
  result.slides.forEach(s => {
    const component = p.components.find(c => c.id === s.opr_component_id);
    ok(component, "slide aponta para componente inexistente");
    ok(s.title.includes(component.name), "título não identifica o componente");
    const chart = s.elements.find(e => e.role === "opr-chart");
    eq(chart.component_id, component.id, "faixa compacta não recebeu o filtro");
    const small = A.buildCompactDisplayList(p, component.id);
    eq(small.prims.filter(q => q.k === "rect" && q.id).length,
      p.activities.filter(a => a.component_id === component.id).length,
      "faixa trouxe atividade de outro componente");
  });
});

t("sincronização reaproveita OPR legado, preserva autoria e é idempotente", () => {
  const p = clone(SAMPLE); setP(p);
  const legacy = { id:"opr1", layout:"opr", title:"OPR legado", elements:[
    { id:"lh", role:"opr-c1-h", type:"text", x:8, y:220, w:200, h:20, text:"Compras" },
    { id:"lb", role:"opr-c1-b", type:"text", x:8, y:242, w:200, h:50,
      runs:[{ text:"Decisão preservada", bold:true, color:"#243782" }] }
  ] };
  p.project.deck = { slides:[legacy] }; const legacyId = legacy.id;
  const first = A.syncComponentOPRSlides();
  eq(first.slides[0].id, legacyId, "slide legado não foi reaproveitado");
  ok(A.runsPlain(first.slides[0].elements.find(e => e.role === "opr-risk-body")).includes("Decisão preservada"),
    "conteúdo autoral foi perdido");
  first.slides[0].title = "Título executivo";
  first.slides[0].elements.find(e => e.role === "opr-title").text = "Título executivo";
  const ids = first.slides.map(s => s.id);
  const second = A.syncComponentOPRSlides();
  eq(second.created, 0);
  eq(second.slides.map(s => s.id), ids, "segunda sincronização duplicou ou trocou slides");
  eq(second.slides[0].title, "Título executivo", "título autoral foi sobrescrito");
});

t("limite de 60 slides aborta a sincronização sem criar parcialmente", () => {
  const p = clone(SAMPLE);
  p.project.deck = { slides:Array.from({ length:56 }, (_, i) =>
    ({ id:"base" + i, layout:"blank", title:"Base", elements:[] })) };
  setP(p);
  let failed = false;
  try { A.syncComponentOPRSlides(); } catch (error) { failed = /limite de 60/.test(error.message); }
  ok(failed, "limite do deck não bloqueou a geração");
  eq(p.project.deck.slides.length, 56, "sincronização deixou criação parcial");
});

group("SPEC-002 §9 — cronograma compacto");
t("faixa compacta é bem menor que o cronograma completo e sem painel nem legenda", () => {
  const full = A.buildDisplayList(SAMPLE), small = A.buildCompactDisplayList(SAMPLE);
  ok(small.width < full.width && small.height < full.height, `${small.width}x${small.height} vs ${full.width}x${full.height}`);
  const svg = A.toSVG(small);
  ok(!svg.includes("Components"), "legenda entrou na faixa compacta");
  ok(!svg.includes(SAMPLE.components[0].name), "painel de componentes entrou na faixa compacta");
  ok(!svg.includes("<image"), "logo entrou na faixa compacta");
  ok(!svg.includes(SAMPLE.project.name), "faixa de título entrou na faixa compacta");
});
t("desenha todas as atividades visíveis e um marco por bandeirinha", () => {
  const small = A.buildCompactDisplayList(SAMPLE);
  eq(small.prims.filter(q => q.k === "rect" && q.id).length, SAMPLE.activities.length);
  const markers = SAMPLE.activities.reduce((n, a) => n + (a.markers || []).length, 0);
  eq(small.prims.filter(q => q.k === "poly").length, SAMPLE.milestones.length + markers);
});
t("respeita ocultação de componente e de milestone", () => {
  const p = clone(SAMPLE), c = p.components[0], m = p.milestones[0];
  const hiddenActs = p.activities.filter(a => a.component_id === c.id).length;
  const hiddenMarkers = p.activities.filter(a => a.component_id === c.id)
    .reduce((n, a) => n + (a.markers || []).length, 0);
  c.hidden = true; m.hidden = true;
  const small = A.buildCompactDisplayList(p);
  eq(small.prims.filter(q => q.k === "rect" && q.id).length, SAMPLE.activities.length - hiddenActs);
  const markers = SAMPLE.activities.reduce((n, a) => n + (a.markers || []).length, 0);
  eq(small.prims.filter(q => q.k === "poly").length,
    SAMPLE.milestones.length - 1 + markers - hiddenMarkers);
});
t("nada é desenhado fora da folha e sem número inválido", () => {
  const small = A.buildCompactDisplayList(SAMPLE);
  small.prims.forEach(q => Object.entries(q).forEach(([k, v]) => {
    if (typeof v === "number") ok(Number.isFinite(v), `${q.k}.${k} = ${v}`);
  }));
  small.prims.forEach(q => {
    const x = q.x !== undefined ? q.x : q.x1;
    if (x !== undefined) ok(x >= -1 && x <= small.width + 1, JSON.stringify(q).slice(0, 60));
  });
  ok(!A.toSVG(small).includes("NaN"));
});
t("é determinístico", () => {
  eq(A.toSVG(A.buildCompactDisplayList(SAMPLE)), A.toSVG(A.buildCompactDisplayList(SAMPLE)));
});
t("modelo semanal também chega ao cronograma compacto", () => {
  const p = clone(SAMPLE);
  p.project.axis_mode = "week";
  p.project.chart_start = "2026-07-27";
  p.project.chart_end = "2026-08-16";
  const svg = A.toSVG(A.buildCompactDisplayList(p));
  ok(svg.includes(">Week31<") && svg.includes(">Week32<"), "régua semanal compacta ausente");
});
t("data curta usa o mês por extenso para não virar dd/mm ambíguo", () => {
  eq(A.shortDate("2027-05-10"), "10/Mai/2027");
  eq(A.shortDate(""), "");
});
t("variante inválida ou ausente cai no cronograma completo", () => {
  eq(A.chartVariant({}), "full");
  eq(A.chartVariant({ variant:"gigante" }), "full");
  eq(A.chartVariant({ variant:"compact" }), "compact");
  ok(A.CHART_VARIANTS.has("compact"));
});
t("o OPR nasce com a faixa compacta na posição do modelo", () => {
  const p = clone(SAMPLE); setP(p);
  const s = oprSlide(p);
  const c = s.elements.find(e => e.role === "opr-chart");
  eq(A.chartVariant(c), "compact");
  eq([c.x, c.y, c.w, c.h], [A.OPR.chart.x, A.OPR.chart.y, A.OPR.chart.w, A.OPR.chart.h]);
  const status = s.elements.find(e => e.role === "opr-status");
  eq([status.x, status.y, status.w, status.h], [A.OPR.status.x, A.OPR.status.y, A.OPR.status.w, A.OPR.status.h]);
});
t("modelo aceita a variante e recusa desenho desconhecido", () => {
  const p = clone(SAMPLE); setP(p);
  oprSlide(p);
  const good = A.buildDeckTemplate("OPR", "One-pager", "2026-09-09T12:00:00.000Z");
  ok(good.deck.slides[0].elements.some(e => e.variant === "compact"), "variante não sobreviveu ao modelo");
  const bad = A.buildDeckTemplate("OPR", "One-pager", "2026-09-09T12:00:00.000Z");
  bad.deck.slides[0].elements.find(e => e.type === "chart").variant = "gigante";
  let failed = false;
  try { A.validateDeckTemplate(bad); } catch (error) { failed = true; }
  ok(failed, "variante inválida foi aceita");
});

report();
