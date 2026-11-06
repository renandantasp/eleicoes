/** Para cada secao Agregada: onde fica a secao principal e em que bairro. */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mapa = JSON.parse(
  readFileSync(resolve(__dirname, "..", "src", "dados", "secoes-araraquara.json"), "utf8"),
);

const agregadas = mapa.secoes.filter((s) => (s.tipoSecao ?? "").toLowerCase() === "agregada");
console.log(`secoes agregadas: ${agregadas.length}\n`);

for (const a of agregadas) {
  const principal = mapa.secoes.find(
    (s) => s.zona === a.zona && s.secao === a.secaoPrincipal,
  );
  console.log(`zona ${a.zona} secao ${a.secao}  (${a.qtEleitores} eleitores)`);
  console.log(`  local:   ${a.localNome}`);
  console.log(`  bairro:  ${a.bairro}`);
  console.log(`  principal: secao ${a.secaoPrincipal ?? "(nao informada)"}`);
  if (principal) {
    console.log(`    local:  ${principal.localNome}`);
    console.log(`    bairro: ${principal.bairro}`);
    console.log(
      `    mesmo bairro? ${principal.bairro === a.bairro ? "SIM" : "NAO <-- afeta o agregado"}`,
    );
  } else {
    console.log(`    secao principal nao encontrada no cadastro`);
  }
  console.log();
}

const tipos = new Map();
for (const s of mapa.secoes) {
  const t = s.tipoSecao ?? "(sem tipo)";
  tipos.set(t, (tipos.get(t) ?? 0) + 1);
}
console.log("tipos de secao no cadastro:");
for (const [t, n] of tipos) console.log(`  ${String(n).padStart(4)}  ${t}`);
