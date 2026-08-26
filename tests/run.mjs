/* Roda tudo em ordem: sintaxe -> núcleo -> interface. */
import { spawnSync } from "node:child_process";
const passos = [["Sintaxe", "tests/check-syntax.mjs"], ["Núcleo", "tests/test-engine.mjs"], ["Interface", "tests/test-ui.mjs"]];
let falhou = false;
for (const [nome, arq] of passos) {
  console.log(`\n${"=".repeat(60)}\n${nome}\n${"=".repeat(60)}`);
  const r = spawnSync(process.execPath, [arq], { stdio:"inherit" });
  if (r.status !== 0) falhou = true;
}
process.exit(falhou ? 1 : 0);
