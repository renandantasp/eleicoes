/**
 * Conferencia cruzada entre o cadastro de secoes e a apuracao.
 * Nao corrige nada: so localiza e nomeia as divergencias.
 *
 * Uso: node scripts/tse-04-conferir.mjs <csv-filtrado-federal>
 */

import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tira = (s) => s.replace(/^"|"$/g, "");

const mapa = JSON.parse(
  readFileSync(resolve(__dirname, "..", "src", "dados", "secoes-araraquara.json"), "utf8"),
);

const comVoto = new Set();
const fluxo = createReadStream(process.argv[2], { encoding: "latin1" });
const linhas = createInterface({ input: fluxo, crlfDelay: Infinity });

let idx = null;
for await (const l of linhas) {
  if (!l.trim()) continue;
  const c = l.split(";").map(tira);
  if (idx === null) {
    idx = {};
    c.forEach((n, k) => (idx[n.toUpperCase()] = k));
    continue;
  }
  if (c[idx.SG_UF].trim().toUpperCase() !== "SP") continue;
  if (c[idx.NM_MUNICIPIO].trim().toUpperCase() !== "ARARAQUARA") continue;
  if (c[idx.CD_CARGO].trim() !== "1") continue;
  comVoto.add(`${Number(c[idx.NR_ZONA])}-${Number(c[idx.NR_SECAO])}`);
}

const noCadastro = new Set(mapa.secoes.map((s) => `${s.zona}-${s.secao}`));

const semApuracao = [...noCadastro].filter((k) => !comVoto.has(k));
const semCadastro = [...comVoto].filter((k) => !noCadastro.has(k));

console.log(`secoes no cadastro:  ${noCadastro.size}`);
console.log(`secoes com apuracao: ${comVoto.size}\n`);

console.log(`secoes do cadastro SEM apuracao presidencial: ${semApuracao.length}`);
let eleitoresOrfaos = 0;
for (const k of semApuracao) {
  const s = mapa.secoes.find((x) => `${x.zona}-${x.secao}` === k);
  eleitoresOrfaos += s.qtEleitores ?? 0;
  console.log(
    `  zona ${s.zona} secao ${s.secao}  |  ${s.qtEleitores} eleitores  |  ${s.localNome}` +
      `  |  ${s.tipoSecao ?? "?"}  |  situacao: ${s.situacaoSecao ?? "?"}`,
  );
}
console.log(`  -> eleitores nessas secoes: ${eleitoresOrfaos}`);

console.log(`\nsecoes com apuracao SEM cadastro: ${semCadastro.length}`);
for (const k of semCadastro) console.log(`  ${k}`);
