/* Extrai o núcleo do app (bloco ENGINE) para rodar em Node, sem DOM.
   Evita duplicar código: os testes exercitam exatamente o que vai no navegador. */
import fs from "node:fs";
import { Buffer } from "node:buffer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const APP = path.join(here, "..", "app", "timeline-studio.html");

export async function loadEngine() {
  const src = fs.readFileSync(APP, "utf8");
  let eng = src.split("ENGINE START")[1].split("ENGINE END")[0];
  eng = eng.slice(eng.indexOf("*/") + 2, eng.lastIndexOf("/*"));   // tira as bordas de comentário dos marcadores
  const sample = src.split("const SAMPLE =")[1].split("const BLANK")[0];
  const cover = src.slice(src.indexOf("/* ---- capa institucional travada"), src.indexOf("function applyLayout(s)"));
  const layout = src.slice(src.indexOf("function applyLayout(s)"), src.indexOf("function generateDeck()"));
  const gen = src.slice(src.indexOf("function generateDeck()"), src.indexOf("/* ---- palco ---- */"));

  const mod = `
    globalThis.atob = s => Buffer.from(s, "base64").toString("latin1");
    const uid = p => p + Math.random().toString(36).slice(2, 7);
    const document = { createElement: () => ({ getContext: () => null }) };
    let selSlide = 0, selEl = null, P;
    const markDirty = () => {};
    const wk = n => (n >= 0 ? "+" : "") + n + "W";
    ${eng}
    ${cover}
    ${layout}
    ${gen}
    const SAMPLE = ${sample.slice(0, sample.lastIndexOf(";"))};
    export function setP(x) { P = x; }
    export { SAMPLE };
    export const api = { weeks, months, validate, computeLayout, buildDisplayList, toSVG,
      buildPDF, buildXlsx, buildPPTX, auditProgram, resolveStatuses, resolveTokens, legendTitle,
      legendHidden, parseBlock, toLegacyTimeline, toLegacyMilestones, toTSV, TL_COLS, MS_COLS,
      midOf, computeKPIs, generateDeck, applyLayout, COVER, STAGE_W, STAGE_H, EMU_PX, brDate, iso };
  `;
  const tmp = path.join(here, ".engine.mjs");
  fs.writeFileSync(tmp, `import { Buffer } from "node:buffer";\n` + mod);
  const m = await import("file://" + tmp + "?t=" + Date.now());
  fs.unlinkSync(tmp);
  return m;
}

/* runner minúsculo, sem dependência */
let pass = 0, fail = 0;
const out = [];
export function t(name, fn) {
  try { fn(); pass++; out.push("  ok   " + name); }
  catch (e) { fail++; out.push("  FALHA " + name + "\n       " + e.message); }
}
export const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || "") + ` esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`); };
export const ok = (v, m) => { if (!v) throw new Error(m || "esperava verdadeiro"); };
export function group(title) { out.push("\n" + title); }
export function report() {
  console.log(out.join("\n"));
  console.log(`\n${pass} passaram, ${fail} falharam`);
  if (fail) process.exit(1);
}
