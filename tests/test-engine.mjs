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

group("SPEC-002 — render");
t("display list é determinístico", () => eq(A.toSVG(A.buildDisplayList(SAMPLE)), A.toSVG(A.buildDisplayList(SAMPLE))));
t("dimensões da fixture batem com a referência", () => {
  const d = A.buildDisplayList(SAMPLE);
  eq([d.width, d.height], [1296, 348]);
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
t("deck gerado tem capa travada e as tabelas da auditoria", () => {
  const p = clone(SAMPLE); setP(p); A.generateDeck();
  const d = p.project.deck;
  eq(d.slides.length, 6);
  eq(d.slides[0].layout, "cover");
  ok(d.slides[0].elements.every(e => e.locked), "toda a capa travada");
  const t3 = d.slides[2].elements.find(e => e.type === "table");
  eq(t3.rows.length, SAMPLE.milestones.length + 1);
});
t("capa: reaplicar restaura a geometria sem apagar o texto", () => {
  const p = clone(SAMPLE); setP(p); A.generateDeck();
  const cap = p.project.deck.slides[0];
  const tit = cap.elements.find(e => e.role === "cover-title");
  tit.text = "281 MY28 MOVER"; tit.x = 500; tit.size = 99;
  A.applyLayout(cap);
  const t2 = cap.elements.find(e => e.role === "cover-title");
  eq([t2.text, t2.x, t2.size], ["281 MY28 MOVER", A.COVER.title.x, A.COVER.title.size]);
});
t("posições do slide convertem para EMU sem deriva", () => {
  eq(A.STAGE_W * A.EMU_PX, 12192000);
  eq(A.STAGE_H * A.EMU_PX, 6858000);
});

report();
