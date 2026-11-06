/**
 * Agrega os votos REAIS por seção e por bairro, para Araraquara.
 *
 * Fonte: TSE, dados abertos, "Resultados / Votação por seção eleitoral"
 *   https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/
 *
 * Liga cada seção ao bairro usando src/dados/secoes-araraquara.json, que por
 * sua vez veio do campo NM_BAIRRO publicado pelo TSE.
 *
 * Nada é estimado. O script não assume quais candidatos disputaram: ele relata
 * o que encontrar no arquivo. Seções do mapeamento sem voto, ou votos sem
 * seção correspondente, são reportados como divergência, não "ajustados".
 *
 * Uso:
 *   node scripts/tse-03-agregar-votos.mjs <csv-filtrado-de-araraquara>
 */

import { createReadStream, writeFileSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MUNICIPIO_ALVO = "ARARAQUARA";
const UF_ALVO = "SP";
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

/** Classifica o votável. Branco e nulo saem dos campos do próprio TSE. */
function classificar(nrVotavel, nmVotavel, dsTipoVotavel) {
  const nm = (nmVotavel ?? "").toUpperCase();
  const tipo = (dsTipoVotavel ?? "").toUpperCase();

  if (tipo.includes("BRANCO") || nm === "BRANCO" || nm === "VOTO BRANCO" || nrVotavel === "95") {
    return "branco";
  }
  if (tipo.includes("NULO") || nm === "NULO" || nm === "VOTO NULO" || nrVotavel === "96") {
    return "nulo";
  }
  return "nominal";
}

function slug(nome) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const csv = process.argv[2];
  if (!csv) {
    console.error("uso: node scripts/tse-03-agregar-votos.mjs <csv>");
    process.exit(1);
  }

  const mapa = JSON.parse(
    readFileSync(resolve(__dirname, "..", "src", "dados", "secoes-araraquara.json"), "utf8"),
  );
  const bairroDaSecao = new Map();
  const localDaSecao = new Map();
  for (const s of mapa.secoes) {
    bairroDaSecao.set(`${s.zona}-${s.secao}`, s.bairro);
    localDaSecao.set(`${s.zona}-${s.secao}`, `${s.zona}-${s.localCodigo}`);
  }
  const infoLocal = new Map(mapa.locais.map((l) => [`${l.zona}-${l.codigo}`, l]));

  /** Eleitorado por local de votacao, pelo cadastro completo. */
  const eleitoradoDoLocal = new Map();
  for (const s of mapa.secoes) {
    const k = `${s.zona}-${s.localCodigo}`;
    eleitoradoDoLocal.set(k, (eleitoradoDoLocal.get(k) ?? 0) + (s.qtEleitores ?? 0));
  }

  /**
   * Eleitorado por bairro contado sobre o CADASTRO COMPLETO (todas as secoes),
   * nao so sobre as que tem apuracao. As secoes do tipo "Agregada" nao recebem
   * voto proprio: seus eleitores votam na secao principal e sao contados la.
   * Como, em Araraquara, as 2 secoes agregadas tem a principal no mesmo local
   * (e portanto no mesmo bairro), somar o cadastro inteiro mantem o eleitorado
   * correto e nao desloca eleitor entre bairros.
   */
  const eleitoradoDoBairro = new Map();
  for (const s of mapa.secoes) {
    if (!s.bairro) continue;
    eleitoradoDoBairro.set(
      s.bairro,
      (eleitoradoDoBairro.get(s.bairro) ?? 0) + (s.qtEleitores ?? 0),
    );
  }
  const secoesDoBairro = new Map();
  for (const s of mapa.secoes) {
    if (!s.bairro) continue;
    secoesDoBairro.set(s.bairro, (secoesDoBairro.get(s.bairro) ?? 0) + 1);
  }

  const fluxo = createReadStream(csv, { encoding: "latin1" });
  const linhas = createInterface({ input: fluxo, crlfDelay: Infinity });

  let idx = null;
  let lidas = 0;
  let usadas = 0;

  const cargosVistos = new Map();
  const votaveis = new Map(); // nrVotavel -> {nome, tipo, votosPorTurno}
  const secoesSemMapeamento = new Set();

  // chave: `${turno}|${zona}-${secao}` -> { votos: Map(nr->qt), branco, nulo }
  const porSecao = new Map();

  for await (const linha of linhas) {
    if (!linha.trim()) continue;

    if (idx === null) {
      const cab = dividir(linha).map((c) => c.replace(/^"|"$/g, "").trim().toUpperCase());
      idx = {};
      cab.forEach((n, i) => (idx[n] = i));
      const exigidas = ["SG_UF", "NM_MUNICIPIO", "NR_ZONA", "NR_SECAO", "CD_CARGO", "NR_VOTAVEL", "QT_VOTOS", "NR_TURNO"];
      const faltando = exigidas.filter((c) => !(c in idx));
      if (faltando.length) {
        console.error(`ERRO: colunas ausentes: ${faltando.join(", ")}`);
        console.error(`colunas presentes: ${cab.join(", ")}`);
        process.exit(1);
      }
      console.log(`colunas (${cab.length}): ${cab.join(", ")}\n`);
      continue;
    }

    lidas++;
    const c = dividir(linha).map((v) => v.replace(/^"|"$/g, ""));
    const pega = (col) => (col in idx ? limpa(c[idx[col]]) : null);

    if ((c[idx.SG_UF] ?? "").trim().toUpperCase() !== UF_ALVO) continue;
    if ((c[idx.NM_MUNICIPIO] ?? "").trim().toUpperCase() !== MUNICIPIO_ALVO) continue;

    const cdCargo = (c[idx.CD_CARGO] ?? "").trim();
    const dsCargo = pega("DS_CARGO") ?? cdCargo;
    cargosVistos.set(dsCargo, (cargosVistos.get(dsCargo) ?? 0) + 1);
    if (cdCargo !== CARGO_PRESIDENTE) continue;

    const turno = Number(pega("NR_TURNO"));
    const zona = Number(pega("NR_ZONA"));
    const secao = Number(pega("NR_SECAO"));
    const nrVotavel = (c[idx.NR_VOTAVEL] ?? "").trim();
    const nmVotavel = pega("NM_VOTAVEL");
    const qt = Number(pega("QT_VOTOS") ?? 0) || 0;

    const chaveSecao = `${zona}-${secao}`;
    if (!bairroDaSecao.has(chaveSecao)) secoesSemMapeamento.add(chaveSecao);

    const tipo = classificar(nrVotavel, nmVotavel, pega("DS_TIPO_VOTAVEL"));

    if (!votaveis.has(nrVotavel)) {
      votaveis.set(nrVotavel, { nr: nrVotavel, nome: nmVotavel ?? `(${nrVotavel})`, tipo, porTurno: {} });
    }
    const v = votaveis.get(nrVotavel);
    v.porTurno[turno] = (v.porTurno[turno] ?? 0) + qt;

    const chave = `${turno}|${chaveSecao}`;
    const reg = porSecao.get(chave) ?? { turno, zona, secao, votos: new Map(), branco: 0, nulo: 0 };
    if (tipo === "branco") reg.branco += qt;
    else if (tipo === "nulo") reg.nulo += qt;
    else reg.votos.set(nrVotavel, (reg.votos.get(nrVotavel) ?? 0) + qt);
    porSecao.set(chave, reg);
    usadas++;
  }

  console.log(`linhas lidas: ${lidas.toLocaleString("pt-BR")}`);
  console.log(`linhas usadas (Araraquara + Presidente): ${usadas.toLocaleString("pt-BR")}\n`);

  console.log("cargos encontrados em Araraquara:");
  for (const [cargo, n] of [...cargosVistos].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(7)} linhas  ${cargo}`);
  }

  const turnos = [...new Set([...porSecao.values()].map((r) => r.turno))].sort();
  console.log(`\nturnos: ${turnos.join(", ")}`);

  console.log("\nvotáveis encontrados (Presidente):");
  const ordenados = [...votaveis.values()].sort(
    (a, b) => (b.porTurno[1] ?? 0) + (b.porTurno[2] ?? 0) - ((a.porTurno[1] ?? 0) + (a.porTurno[2] ?? 0)),
  );
  for (const v of ordenados) {
    const t1 = (v.porTurno[1] ?? 0).toLocaleString("pt-BR");
    const t2 = (v.porTurno[2] ?? 0).toLocaleString("pt-BR");
    console.log(`  nr ${String(v.nr).padStart(3)} [${v.tipo.padEnd(7)}]  1T ${t1.padStart(8)}  2T ${t2.padStart(8)}  ${v.nome}`);
  }

  if (secoesSemMapeamento.size) {
    console.log(`\nATENCAO: ${secoesSemMapeamento.size} secoes com voto mas sem bairro no mapeamento:`);
    console.log(`  ${[...secoesSemMapeamento].slice(0, 20).join(", ")}`);
  }

  // ----------------------------------------------------------- agrega bairro
  const nominais = ordenados.filter((v) => v.tipo === "nominal");
  const candidatos = nominais.map((v) => ({
    id: slug(v.nome),
    nr: v.nr,
    nome: v.nome,
    votos1: v.porTurno[1] ?? 0,
    votos2: v.porTurno[2] ?? 0,
  }));

  const bairros = new Map();
  for (const reg of porSecao.values()) {
    const bairro = bairroDaSecao.get(`${reg.zona}-${reg.secao}`);
    if (!bairro) continue;

    const b = bairros.get(bairro) ?? { bairro, turnos: {}, eleitorado: 0, secoes: new Set() };
    b.secoes.add(`${reg.zona}-${reg.secao}`);

    const t = b.turnos[reg.turno] ?? { votos: {}, brancos: 0, nulos: 0, comparecimento: 0 };
    for (const [nr, qt] of reg.votos) {
      const cand = candidatos.find((c) => c.nr === nr);
      const id = cand ? cand.id : `nr-${nr}`;
      t.votos[id] = (t.votos[id] ?? 0) + qt;
      t.comparecimento += qt;
    }
    t.brancos += reg.branco;
    t.nulos += reg.nulo;
    t.comparecimento += reg.branco + reg.nulo;
    b.turnos[reg.turno] = t;
    bairros.set(bairro, b);
  }

  for (const b of bairros.values()) {
    b.eleitorado = eleitoradoDoBairro.get(b.bairro) ?? 0;
    b.secoesCadastro = secoesDoBairro.get(b.bairro) ?? b.secoes.size;
  }

  // ------------------------------------------- agrega tambem por local de votacao
  const locaisAgregados = new Map();
  for (const reg of porSecao.values()) {
    const chaveLocal = localDaSecao.get(`${reg.zona}-${reg.secao}`);
    if (!chaveLocal) continue;

    const l = locaisAgregados.get(chaveLocal) ?? { chave: chaveLocal, turnos: {} };
    const t = l.turnos[reg.turno] ?? { votos: {}, brancos: 0, nulos: 0, comparecimento: 0 };
    for (const [nr, qt] of reg.votos) {
      const cand = candidatos.find((c) => c.nr === nr);
      const id = cand ? cand.id : `nr-${nr}`;
      t.votos[id] = (t.votos[id] ?? 0) + qt;
      t.comparecimento += qt;
    }
    t.brancos += reg.branco;
    t.nulos += reg.nulo;
    t.comparecimento += reg.branco + reg.nulo;
    l.turnos[reg.turno] = t;
    locaisAgregados.set(chaveLocal, l);
  }

  const saida = {
    SIMULADO: false,
    fonte: {
      orgao: "Tribunal Superior Eleitoral (TSE) - dados abertos",
      conjuntos: [
        "Resultados / Votacao por secao eleitoral (votacao_secao_2026_SP)",
        "Eleitorado / Locais de votacao (eleitorado_local_votacao_2026_SP)",
      ],
      url: "https://dadosabertos.tse.jus.br",
      arquivo: csv.split(/[\\/]/).pop(),
    },
    metodo:
      "Votos somados por secao e agrupados pelo bairro do local de votacao, campo NM_BAIRRO " +
      "publicado pelo TSE. Comparecimento = soma de todos os votos (nominais + brancos + nulos) " +
      "da secao. Abstencao = eleitorado da secao (QT_ELEITOR_SECAO) menos comparecimento. " +
      "Nenhum valor estimado ou interpolado.",
    ressalva:
      "O bairro e o do LOCAL DE VOTACAO, nao o da residencia do eleitor.",
    notaSecoesAgregadas:
      "2 das 604 secoes do cadastro sao do tipo 'Agregada' (52 eleitores) e nao recebem " +
      "apuracao propria: seus eleitores votam na secao principal. Nas duas, a secao principal " +
      "fica no mesmo local e no mesmo bairro, entao o eleitorado por bairro conta o cadastro " +
      "completo sem deslocar eleitor entre bairros.",
    municipio: MUNICIPIO_ALVO,
    uf: UF_ALVO,
    codigoIbge: "3503208",
    pleito: "Eleicao presidencial 2026",
    extraidoEm: new Date().toISOString().slice(0, 10),
    candidatos,
    locais: [...locaisAgregados.values()]
      .map((l) => {
        const info = infoLocal.get(l.chave);
        const eleitorado = eleitoradoDoLocal.get(l.chave) ?? 0;
        const monta = (turno) => {
          const t = l.turnos[turno];
          if (!t) return null;
          const validos = Object.values(t.votos).reduce((s, v) => s + v, 0);
          return {
            comparecimento: t.comparecimento,
            validos,
            brancos: t.brancos,
            nulos: t.nulos,
            abstencoes: eleitorado - t.comparecimento,
            votos: t.votos,
          };
        };
        return {
          id: l.chave,
          zona: info?.zona ?? null,
          codigo: info?.codigo ?? null,
          nome: info?.nome ?? null,
          endereco: info?.endereco ?? null,
          bairro: info?.bairro ?? null,
          bairroId: info?.bairro ? slug(info.bairro) : null,
          cep: info?.cep ?? null,
          latitude: info?.latitude ?? null,
          longitude: info?.longitude ?? null,
          eleitorado,
          qtdSecoes: info?.secoes.length ?? 0,
          turno1: monta(1),
          turno2: monta(2),
        };
      })
      .sort((a, b) => b.eleitorado - a.eleitorado),
    bairros: [...bairros.values()]
      .map((b) => {
        const monta = (turno) => {
          const t = b.turnos[turno];
          if (!t) return null;
          const validos = Object.values(t.votos).reduce((s, v) => s + v, 0);
          return {
            comparecimento: t.comparecimento,
            validos,
            brancos: t.brancos,
            nulos: t.nulos,
            abstencoes: b.eleitorado - t.comparecimento,
            votos: t.votos,
          };
        };
        return {
          id: slug(b.bairro),
          nome: b.bairro,
          eleitorado: b.eleitorado,
          qtdSecoes: b.secoesCadastro,
          qtdSecoesApuradas: b.secoes.size,
          turno1: monta(1),
          turno2: monta(2),
        };
      })
      .sort((a, b) => b.eleitorado - a.eleitorado),
  };

  const destino = resolve(__dirname, "..", "src", "dados", "votacao-real.json");
  writeFileSync(destino, JSON.stringify(saida, null, 1));

  // ------------------------------------------------------------- conferencia
  console.log("\n--- totais do municipio, por turno ---");
  for (const turno of turnos) {
    const chave = turno === 1 ? "turno1" : "turno2";
    let validos = 0, brancos = 0, nulos = 0, comp = 0, abst = 0;
    const porCand = {};
    for (const b of saida.bairros) {
      const t = b[chave];
      if (!t) continue;
      validos += t.validos; brancos += t.brancos; nulos += t.nulos;
      comp += t.comparecimento; abst += t.abstencoes;
      for (const [id, v] of Object.entries(t.votos)) porCand[id] = (porCand[id] ?? 0) + v;
    }
    const eleit = saida.bairros.reduce((s, b) => s + b.eleitorado, 0);
    console.log(`\n${turno}o turno  (eleitorado ${eleit.toLocaleString("pt-BR")}, comparecimento ${comp.toLocaleString("pt-BR")})`);
    for (const [id, v] of Object.entries(porCand).sort((a, b) => b[1] - a[1])) {
      if (!v) continue;
      const cand = candidatos.find((c) => c.id === id);
      console.log(`  ${(cand?.nome ?? id).padEnd(32)} ${v.toLocaleString("pt-BR").padStart(8)}  ${((v / validos) * 100).toFixed(2).padStart(6)}%`);
    }
    console.log(`  brancos ${brancos.toLocaleString("pt-BR")} | nulos ${nulos.toLocaleString("pt-BR")} | abstencao ${((abst / eleit) * 100).toFixed(2)}%`);
  }

  console.log(`\nbairros com resultado: ${saida.bairros.length}`);
  console.log(`locais com resultado: ${saida.locais.length}`);

  // conferencia: bairros e locais tem que somar o mesmo
  for (const chave of ["turno1", "turno2"]) {
    const porBairro = saida.bairros.reduce((s, b) => s + (b[chave]?.validos ?? 0), 0);
    const porLocal = saida.locais.reduce((s, l) => s + (l[chave]?.validos ?? 0), 0);
    console.log(
      `  validos ${chave}: por bairro ${porBairro.toLocaleString("pt-BR")} | ` +
        `por local ${porLocal.toLocaleString("pt-BR")}  ${porBairro === porLocal ? "ok" : "DIVERGE"}`,
    );
  }

  const semCoord = saida.locais.filter((l) => l.latitude == null || l.longitude == null);
  console.log(`  locais sem coordenada: ${semCoord.length}${semCoord.length ? " -> " + semCoord.map((l) => l.nome).join(", ") : ""}`);

  console.log(`-> ${destino}`);
}

main();
