/* Checagem de sintaxe do script embutido no HTML. Rápida, roda antes dos testes. */
import fs from "node:fs";
import vm from "node:vm";
import { APP } from "./harness.mjs";
const src = fs.readFileSync(APP, "utf8");
const js = src.split("<script>")[1].split("</script>")[0];
try { new vm.Script(js, { filename:"timeline-studio.html" }); console.log("sintaxe ok —", js.split("\n").length, "linhas"); }
catch (e) { console.error("erro de sintaxe:", e.message); process.exit(1); }
