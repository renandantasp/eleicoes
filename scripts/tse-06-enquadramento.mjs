/** Compara o bbox de todos os locais com o bbox que cobre 95% do eleitorado. */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = JSON.parse(
  readFileSync(resolve(__dirname, "..", "src", "dados", "votacao-real.json"), "utf8"),
);
const locais = base.locais.filter((l) => l.latitude != null && l.longitude != null);
const total = locais.reduce((s, l) => s + l.eleitorado, 0);

const lat0 = locais.reduce((s, l) => s + l.latitude * l.eleitorado, 0) / total;
const lon0 = locais.reduce((s, l) => s + l.longitude * l.eleitorado, 0) / total;
const k = Math.cos((lat0 * Math.PI) / 180);

const dist = (l) =>
  (((l.latitude - lat0) * 111.32) ** 2 + ((l.longitude - lon0) * 111.32 * k) ** 2) ** 0.5;

const ordenados = [...locais].sort((a, b) => dist(a) - dist(b));

function bbox(lista) {
  const lats = lista.map((l) => l.latitude);
  const lons = lista.map((l) => l.longitude);
  const dLat = (Math.max(...lats) - Math.min(...lats)) * 111.32;
  const dLon = (Math.max(...lons) - Math.min(...lons)) * 111.32 * k;
  return { alturaKm: dLat.toFixed(1), larguraKm: dLon.toFixed(1) };
}

console.log(`locais geolocalizados: ${locais.length}, eleitorado ${total.toLocaleString("pt-BR")}`);
console.log(`centroide ponderado: ${lat0.toFixed(5)}, ${lon0.toFixed(5)}\n`);

for (const fracao of [0.9, 0.95, 0.98, 1]) {
  const sel = [];
  let acc = 0;
  for (const l of ordenados) {
    sel.push(l);
    acc += l.eleitorado;
    if (acc >= total * fracao) break;
  }
  const b = bbox(sel);
  console.log(
    `${(fracao * 100).toFixed(0)}% -> ${String(sel.length).padStart(2)} locais  ` +
      `bbox ${b.larguraKm} x ${b.alturaKm} km  ` +
      `(raio max ${dist(sel.at(-1)).toFixed(1)} km)`,
  );
}

console.log("\nlocais mais distantes do centroide:");
for (const l of [...ordenados].reverse().slice(0, 8)) {
  console.log(
    `  ${dist(l).toFixed(1).padStart(5)} km  ${String(l.eleitorado).padStart(6)} eleitores  ${l.nome} (${l.bairro})`,
  );
}
