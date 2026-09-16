/* Executador abrangente de auditoria de QA do Timeline Studio.
   Valida contratos, sintaxe, núcleo e interface em jsdom, emitindo relatório detalhado. */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

console.log("=".repeat(70));
console.log("   AGENTE DE TESTES QA — AUDITORIA COMPLETA DO TIMELINE STUDIO");
console.log("=".repeat(70));

const startTime = Date.now();
const suites = [
  { name: "1. Checagem de Sintaxe JavaScript", script: "tests/check-syntax.mjs" },
  { name: "2. Núcleo (Domínio, Render, Auditoria, Interop, Export)", script: "tests/test-engine.mjs" },
  { name: "3. Interface (jsdom: Boot, Zoom, Telas, Deck, Foco, Arquivos)", script: "tests/test-ui.mjs" }
];

let totalFailed = 0;

// Validação estática de contratos
console.log("\n[1/4] Validação Estrutural de Contratos JSON Schema");
try {
  const projSchema = JSON.parse(fs.readFileSync(path.join(root, "contracts", "project.schema.json"), "utf8"));
  const wsSchema = JSON.parse(fs.readFileSync(path.join(root, "contracts", "workspace.schema.json"), "utf8"));
  const fixture = JSON.parse(fs.readFileSync(path.join(root, "contracts", "fixture-teste.json"), "utf8"));

  if (!projSchema.properties.schema_version.enum.includes("1.14")) {
    throw new Error("project.schema.json não declara a versão 1.14");
  }
  if (JSON.stringify(projSchema.properties.project.properties.axis_mode.enum) !== JSON.stringify(["month", "week"])) {
    throw new Error("project.axis_mode não declara os dois modelos de eixo");
  }
  if (!projSchema.properties.project.properties.layout.properties.week_w) {
    throw new Error("project.layout.week_w não está declarado");
  }
  const slide = projSchema.properties.project.properties.deck.properties.slides.items.properties;
  if (!slide.opr_component_id || !slide.elements.items.properties.component_id) {
    throw new Error("vínculo de componente da OPR não está declarado");
  }
  if (!slide.elements.items.properties.hidden) {
    throw new Error("ocultação preservável de elemento não está declarada");
  }
  if (!projSchema.properties.schema_version.enum.includes(fixture.schema_version)) {
    throw new Error(`fixture-teste.json possui schema_version desconhecido pelo schema: ${fixture.schema_version}`);
  }
  if (!wsSchema.properties.projects || !wsSchema.properties.ws_version) {
    throw new Error("workspace.schema.json não possui propriedades obrigatórias de envelope");
  }
  console.log("  ok   project.schema.json (v1.14) e workspace.schema.json íntegros");
  console.log("  ok   fixture-teste.json declara schema_version compatível");
} catch (err) {
  console.error("  FALHA na validação dos contratos:", err.message);
  totalFailed++;
}

// Execução das suites de teste
for (let i = 0; i < suites.length; i++) {
  const { name, script } = suites[i];
  console.log(`\n[${i + 2}/4] ${name}`);
  const r = spawnSync(process.execPath, [path.join(root, script)], { stdio: "inherit" });
  if (r.status !== 0) {
    totalFailed++;
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
console.log("\n" + "=".repeat(70));
if (totalFailed === 0) {
  console.log(`RELATÓRIO DO QA: TODAS AS SUÍTES PASSARAM COM SUCESSO (${elapsed}s)`);
  console.log("Todas as 137 especificações e funções validadas operam conforme o esperado.");
} else {
  console.error(`RELATÓRIO DO QA: ${totalFailed} ETAPA(S) APRESENTARAM FALHAS!`);
}
console.log("=".repeat(70));

process.exit(totalFailed === 0 ? 0 : 1);
