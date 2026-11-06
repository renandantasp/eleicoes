/**
 * Validacao do mapeamento gerado por tse-01-mapear-secoes.mjs.
 *
 * Confere, sem corrigir nada:
 *   - se cada local de votacao cai dentro do limite municipal do IBGE;
 *   - quais registros tem campo faltando na fonte;
 *   - coerencia entre secoes, locais e eleitorado.
 *
 * Nada aqui preenche, estima ou move dado. O objetivo e so saber se o que o
 * TSE publicou bate com a geografia oficial do municipio.
 *
 * Uso: node scripts/tse-02-validar.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function pontoEmAnel([x, y], anel) {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i];
    const [xj, yj] = anel[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

function pontoNoGeometry(pt, geom) {
  const polis = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const poli of polis) {
    if (!pontoEmAnel(pt, poli[0])) continue;
    let buraco = false;
    for (let k = 1; k < poli.length; k++) if (pontoEmAnel(pt, poli[k])) { buraco = true; break; }
    if (!buraco) return true;
  }
  return false;
}

const mapa = JSON.parse(
  readFileSync(resolve(__dirname, "..", "src", "dados", "secoes-araraquara.json"), "utf8"),
);
const municipio = JSON.parse(
  readFileSync(resolve(__dirname, "municipio_ibge.geojson"), "utf8"),
);
const geom = municipio.features[0].geometry;

console.log(`fonte: ${mapa.fonte.arquivo}`);
console.log(`eleicoes: ${mapa.fonte.eleicoes.join(" / ")}\n`);

// --- 1. locais dentro do limite municipal ---------------------------------
const dentro = [];
const fora = [];
const semCoord = [];

for (const l of mapa.locais) {
  if (l.latitude == null || l.longitude == null) {
    semCoord.push(l);
    continue;
  }
  (pontoNoGeometry([l.longitude, l.latitude], geom) ? dentro : fora).push(l);
}

console.log("locais de votacao x limite municipal do IBGE:");
console.log(`  dentro do municipio: ${dentro.length}`);
console.log(`  fora do municipio:   ${fora.length}`);
console.log(`  sem coordenada:      ${semCoord.length}`);

for (const l of fora) {
  console.log(`    FORA  zona ${l.zona} local ${l.codigo}  ${l.nome}`);
  console.log(`          ${l.endereco} / ${l.bairro}  (${l.latitude}, ${l.longitude})`);
}
for (const l of semCoord) {
  console.log(`    SEM COORDENADA  zona ${l.zona} local ${l.codigo}  ${l.nome}`);
  console.log(`          ${l.endereco} / ${l.bairro}  -- ${l.secoes.length} secoes, ${l.eleitores} eleitores`);
}

// --- 2. coerencia dos totais ----------------------------------------------
const somaSecoesLocais = mapa.locais.reduce((s, l) => s + l.secoes.length, 0);
const somaEleitoresLocais = mapa.locais.reduce((s, l) => s + l.eleitores, 0);
const somaEleitoresBairros = mapa.bairros.reduce((s, b) => s + b.eleitores, 0);
const somaSecoesBairros = mapa.bairros.reduce((s, b) => s + b.qtdSecoes, 0);

console.log("\ncoerencia dos agregados:");
console.log(`  secoes (lista)         ${mapa.secoes.length}`);
console.log(`  secoes (via locais)    ${somaSecoesLocais}   ${somaSecoesLocais === mapa.secoes.length ? "ok" : "DIVERGE"}`);
console.log(`  secoes (via bairros)   ${somaSecoesBairros}   ${somaSecoesBairros === mapa.secoes.length ? "ok" : "DIVERGE"}`);
console.log(`  eleitorado (total)     ${mapa.totais.eleitoradoTotal.toLocaleString("pt-BR")}`);
console.log(`  eleitorado (locais)    ${somaEleitoresLocais.toLocaleString("pt-BR")}   ${somaEleitoresLocais === mapa.totais.eleitoradoTotal ? "ok" : "DIVERGE"}`);
console.log(`  eleitorado (bairros)   ${somaEleitoresBairros.toLocaleString("pt-BR")}   ${somaEleitoresBairros === mapa.totais.eleitoradoTotal ? "ok" : "DIVERGE"}`);

// --- 3. secoes por turno ---------------------------------------------------
const so1 = mapa.secoes.filter((s) => s.turnos.length === 1 && s.turnos[0] === 1);
const so2 = mapa.secoes.filter((s) => s.turnos.length === 1 && s.turnos[0] === 2);
const ambos = mapa.secoes.filter((s) => s.turnos.length === 2);
console.log("\nsecoes por turno:");
console.log(`  nos dois turnos: ${ambos.length}`);
console.log(`  so no 1o turno:  ${so1.length}`);
console.log(`  so no 2o turno:  ${so2.length}`);

// --- 4. amplitude das coordenadas -----------------------------------------
const lats = dentro.map((l) => l.latitude);
const lons = dentro.map((l) => l.longitude);
console.log("\nextensao dos locais (graus):");
console.log(`  latitude  ${Math.min(...lats).toFixed(5)} .. ${Math.max(...lats).toFixed(5)}`);
console.log(`  longitude ${Math.min(...lons).toFixed(5)} .. ${Math.max(...lons).toFixed(5)}`);

// --- 5. bairros com um unico local (candidatos a agrupamento) -------------
console.log(`\nbairros distintos: ${mapa.bairros.length}`);
console.log(`zonas eleitorais: ${mapa.totais.zonasEleitorais.join(", ")}`);
