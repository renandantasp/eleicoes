/**
 * Agrega a apuracao presidencial de 2026 por MUNICIPIO, para todo o Brasil.
 *
 * Fonte: TSE, "Resultados / Votacao por secao eleitoral", arquivo federal
 *   votacao_secao_2026_BR.csv  (cd_eleicao 6257 = 1o turno, 6258 = 2o turno)
 *
 * Soma os votos de cada secao no seu municipio. Nenhum valor e estimado.
 *
 * Saida: public/municipios-brasil.json  (carregado sob demanda pela aba de
 *        insights, para nao pesar o bundle principal)
 *
 * Uso: node scripts/tse-07-municipios.mjs <caminho>/votacao_secao_2026_BR.csv
 */

import { createReadStream, writeFileSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CARGO_PRESIDENTE = "1";
const SENTINELAS = new Set(["#NULO#", "#NULO", "#NE#", "#NE", "-1", "-3", ""]);
const limpa = (v) => {
  if (v == null) return null;
  const t = String(v).trim();
  return SENTINELAS.has(t.toUpperCase()) ? null : t;
};

function dividir(linha) {
  const campos = [];
  let atual = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') { atual += '"'; i++; }
      else aspas = !aspas;
    } else if (c === ";" && !aspas) { campos.push(atual); atual = ""; }
    else atual += c;
  }
  campos.push(atual);
  return campos;
}

function classificar(nr, nm) {
  const n = (nm ?? "").toUpperCase();
  if (n.includes("BRANCO") || nr === "95") return "branco";
  if (n.includes("NULO") || nr === "96") return "nulo";
  return "nominal";
}

async function main() {
  const csv = process.argv[2];
  if (!csv) {
    console.error("uso: node scripts/tse-07-municipios.mjs <csv>");
    process.exit(1);
  }

  const fluxo = createReadStream(csv, { encoding: "latin1", highWaterMark: 1 << 20 });
  const linhas = createInterface({ input: fluxo, crlfDelay: Infinity });

  let idx = null;
  let lidas = 0;

  /** chave: cdMunicipio -> { uf, nome, t1:{...}, t2:{...} } */
  const municipios = new Map();
  /** numero de urna -> nome, para identificar os finalistas */
  const votaveis = new Map();

  const novoTurno = () => ({ votos: {}, brancos: 0, nulos: 0, comparecimento: 0 });

  for await (const linha of linhas) {
    if (!linha.trim()) continue;

    if (idx === null) {
      const cab = dividir(linha).map((c) => c.replace(/^"|"$/g, "").trim().toUpperCase());
      idx = {};
      cab.forEach((n, i) => (idx[n] = i));
      const exigidas = ["CD_MUNICIPIO", "NM_MUNICIPIO", "SG_UF", "NR_TURNO", "CD_CARGO", "NR_VOTAVEL", "QT_VOTOS"];
      const faltando = exigidas.filter((c) => !(c in idx));
      if (faltando.length) {
        console.error(`ERRO: colunas ausentes: ${faltando.join(", ")}`);
        process.exit(1);
      }
      continue;
    }

    lidas++;
    if (lidas % 1_000_000 === 0) console.log(`  ${(lidas / 1e6).toFixed(0)}M linhas...`);

    const c = dividir(linha).map((v) => v.replace(/^"|"$/g, ""));
    if ((c[idx.CD_CARGO] ?? "").trim() !== CARGO_PRESIDENTE) continue;

    const cd = (c[idx.CD_MUNICIPIO] ?? "").trim();
    const turno = (c[idx.NR_TURNO] ?? "").trim();
    const nr = (c[idx.NR_VOTAVEL] ?? "").trim();
    const qt = Number(limpa(c[idx.QT_VOTOS]) ?? 0) || 0;

    let m = municipios.get(cd);
    if (!m) {
      m = {
        cd,
        uf: (c[idx.SG_UF] ?? "").trim(),
        nome: (c[idx.NM_MUNICIPIO] ?? "").trim(),
        t1: novoTurno(),
        t2: novoTurno(),
      };
      municipios.set(cd, m);
    }

    const nm = limpa(c[idx.NM_VOTAVEL]);
    if (!votaveis.has(nr)) votaveis.set(nr, nm ?? nr);

    const alvo = turno === "2" ? m.t2 : m.t1;
    const tipo = classificar(nr, nm);
    if (tipo === "branco") alvo.brancos += qt;
    else if (tipo === "nulo") alvo.nulos += qt;
    else alvo.votos[nr] = (alvo.votos[nr] ?? 0) + qt;
    alvo.comparecimento += qt;
  }

  console.log(`\nlinhas lidas: ${lidas.toLocaleString("pt-BR")}`);
  console.log(`municipios: ${municipios.size.toLocaleString("pt-BR")}`);

  // --- quem sao os dois finalistas: quem tem voto no 2o turno ---------------
  const totalT2 = {};
  for (const m of municipios.values()) {
    for (const [nr, v] of Object.entries(m.t2.votos)) totalT2[nr] = (totalT2[nr] ?? 0) + v;
  }
  const finalistas = Object.entries(totalT2)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([nr, v]) => ({ nr, nome: votaveis.get(nr), votos: v }));

  console.log("\nfinalistas do 2o turno (Brasil):");
  for (const f of finalistas) {
    console.log(`  ${f.nr}  ${String(f.nome).padEnd(32)} ${f.votos.toLocaleString("pt-BR")}`);
  }
  if (finalistas.length !== 2) {
    console.error(`ERRO: esperava 2 finalistas, encontrei ${finalistas.length}`);
    process.exit(1);
  }

  const [A, B] = finalistas; // A = mais votado no 2o turno no pais

  // --- monta a saida --------------------------------------------------------
  const lista = [];
  let semT1 = 0;

  for (const m of municipios.values()) {
    const a1 = m.t1.votos[A.nr] ?? 0;
    const b1 = m.t1.votos[B.nr] ?? 0;
    const a2 = m.t2.votos[A.nr] ?? 0;
    const b2 = m.t2.votos[B.nr] ?? 0;

    const v1 = Object.values(m.t1.votos).reduce((s, v) => s + v, 0);
    const v2 = Object.values(m.t2.votos).reduce((s, v) => s + v, 0);

    if (v1 === 0 || v2 === 0) { semT1++; continue; }

    const dois1 = a1 + b1;
    const dois2 = a2 + b2;

    lista.push({
      cd: m.cd,
      nome: m.nome,
      uf: m.uf,
      // votos dos dois finalistas em cada turno
      a1, b1, a2, b2,
      // validos e comparecimento, para contexto
      v1, v2,
      c1: m.t1.comparecimento,
      c2: m.t2.comparecimento,
      // share no voto a dois, que e a medida sem o efeito mecanico
      p1: dois1 > 0 ? (a1 / dois1) * 100 : 0,
      p2: dois2 > 0 ? (a2 / dois2) * 100 : 0,
    });
  }

  if (semT1) console.log(`\n${semT1} municipios descartados por nao ter voto em algum turno`);

  const saida = {
    fonte: {
      orgao: "Tribunal Superior Eleitoral (TSE) - dados abertos",
      conjunto: "Resultados / Votacao por secao eleitoral (votacao_secao_2026_BR)",
      url: "https://dadosabertos.tse.jus.br",
    },
    pleito: "Eleicao presidencial 2026",
    datas: { turno1: "04/10/2026", turno2: "25/10/2026" },
    extraidoEm: new Date().toISOString().slice(0, 10),
    candidatos: {
      A: { numero: A.nr, nomeTse: A.nome },
      B: { numero: B.nr, nomeTse: B.nome },
    },
    totais: {
      municipios: lista.length,
      a1: lista.reduce((s, m) => s + m.a1, 0),
      b1: lista.reduce((s, m) => s + m.b1, 0),
      a2: lista.reduce((s, m) => s + m.a2, 0),
      b2: lista.reduce((s, m) => s + m.b2, 0),
      v1: lista.reduce((s, m) => s + m.v1, 0),
      v2: lista.reduce((s, m) => s + m.v2, 0),
    },
    municipios: lista.sort((x, y) => y.v2 - x.v2),
  };

  const dir = resolve(__dirname, "..", "public");
  mkdirSync(dir, { recursive: true });
  const destino = resolve(dir, "municipios-brasil.json");
  writeFileSync(destino, JSON.stringify(saida));

  // --- conferencia ----------------------------------------------------------
  const t = saida.totais;
  console.log("\n--- totais do Brasil ---");
  console.log(`1o turno: ${A.nome} ${t.a1.toLocaleString("pt-BR")} (${((t.a1 / t.v1) * 100).toFixed(2)}%)` +
    ` | ${B.nome} ${t.b1.toLocaleString("pt-BR")} (${((t.b1 / t.v1) * 100).toFixed(2)}%)`);
  console.log(`2o turno: ${A.nome} ${t.a2.toLocaleString("pt-BR")} (${((t.a2 / t.v2) * 100).toFixed(2)}%)` +
    ` | ${B.nome} ${t.b2.toLocaleString("pt-BR")} (${((t.b2 / t.v2) * 100).toFixed(2)}%)`);
  console.log(`\nmunicipios na saida: ${lista.length.toLocaleString("pt-BR")}`);
  console.log(`UFs: ${[...new Set(lista.map((m) => m.uf))].sort().join(" ")}`);
  console.log(`-> ${destino}`);
}

main();
