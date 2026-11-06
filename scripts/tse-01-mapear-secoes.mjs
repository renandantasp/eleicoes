/**
 * Mapeamento REAL das secoes eleitorais de Araraquara -> bairro.
 *
 * Fonte: TSE, dados abertos, "Eleitorado / Locais de votacao"
 *   https://cdn.tse.jus.br/estatistica/sead/odsele/eleitorado_locais_votacao/
 *
 * O proprio TSE publica, por secao eleitoral, o local de votacao com endereco,
 * bairro (NM_BAIRRO), CEP e coordenadas. Ou seja: o bairro NAO e inferido aqui,
 * ele vem preenchido na fonte.
 *
 * Regras deste script:
 *   - nenhum valor e estimado, geocodificado ou preenchido por aproximacao;
 *   - sentinelas do TSE (#NULO#, #NE#, #NE, -1, -3) viram null e sao contadas
 *     como lacuna, nunca como dado;
 *   - o que nao estiver na fonte sai como lacuna explicita no relatorio.
 *
 * Uso:
 *   node scripts/tse-01-mapear-secoes.mjs <caminho-do-csv-extraido>
 */

import { createReadStream } from "node:fs";
import { writeFileSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MUNICIPIO_ALVO = "ARARAQUARA";
const UF_ALVO = "SP";

/** Valores que o TSE usa para "nao informado". Nunca sao dado real. */
const SENTINELAS = new Set(["#NULO#", "#NULO", "#NE#", "#NE", "-1", "-3", "", "NA", "N/A"]);

function limpa(v) {
  if (v == null) return null;
  const t = String(v).trim();
  return SENTINELAS.has(t.toUpperCase()) ? null : t;
}

/** Divide uma linha CSV com separador ';' respeitando aspas duplas. */
function dividir(linha) {
  const campos = [];
  let atual = "";
  let dentroAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (dentroAspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        dentroAspas = !dentroAspas;
      }
    } else if (c === ";" && !dentroAspas) {
      campos.push(atual);
      atual = "";
    } else {
      atual += c;
    }
  }
  campos.push(atual);
  return campos;
}

/** Numero brasileiro ("-21,795") ou ponto decimal. Retorna null se nao for valido. */
function numero(v) {
  const t = limpa(v);
  if (t == null) return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const csv = process.argv[2];
  if (!csv) {
    console.error("uso: node scripts/tse-01-mapear-secoes.mjs <caminho-do-csv>");
    process.exit(1);
  }

  const fluxo = createReadStream(csv, { encoding: "latin1" });
  const linhas = createInterface({ input: fluxo, crlfDelay: Infinity });

  let cabecalho = null;
  let idx = {};
  let totalLinhas = 0;
  const registros = [];
  const eleicoesVistas = new Set();

  for await (const linha of linhas) {
    if (!linha.trim()) continue;

    if (cabecalho === null) {
      cabecalho = dividir(linha).map((c) => c.replace(/^"|"$/g, "").trim().toUpperCase());
      cabecalho.forEach((nome, i) => (idx[nome] = i));
      console.log(`colunas (${cabecalho.length}):\n  ${cabecalho.join("\n  ")}\n`);

      const exigidas = ["SG_UF", "NM_MUNICIPIO", "NR_ZONA", "NR_SECAO", "NM_LOCAL_VOTACAO"];
      const faltando = exigidas.filter((c) => !(c in idx));
      if (faltando.length) {
        console.error(`ERRO: colunas esperadas ausentes: ${faltando.join(", ")}`);
        process.exit(1);
      }
      continue;
    }

    totalLinhas++;
    const campos = dividir(linha).map((c) => c.replace(/^"|"$/g, ""));

    const uf = (campos[idx.SG_UF] ?? "").trim().toUpperCase();
    const municipio = (campos[idx.NM_MUNICIPIO] ?? "").trim().toUpperCase();
    if (uf !== UF_ALVO || municipio !== MUNICIPIO_ALVO) continue;

    const pega = (col) => (col in idx ? limpa(campos[idx[col]]) : null);

    const eleicao = pega("DS_ELEICAO") ?? pega("AA_ELEICAO") ?? "?";
    const turno = pega("NR_TURNO");
    eleicoesVistas.add(`${eleicao}${turno ? ` | turno ${turno}` : ""}`);

    registros.push({
      eleicao,
      turno: turno ? Number(turno) : null,
      dataEleicao: pega("DT_ELEICAO"),
      zona: Number(pega("NR_ZONA")),
      secao: Number(pega("NR_SECAO")),
      tipoSecao: pega("DS_TIPO_SECAO_AGREGADA"),
      secaoPrincipal: pega("NR_SECAO_PRINCIPAL") ? Number(pega("NR_SECAO_PRINCIPAL")) : null,
      situacaoSecao: pega("DS_SITU_SECAO"),
      localCodigo: pega("NR_LOCAL_VOTACAO"),
      localNome: pega("NM_LOCAL_VOTACAO"),
      tipoLocal: pega("DS_TIPO_LOCAL"),
      situacaoLocal: pega("DS_SITU_LOCAL_VOTACAO"),
      endereco: pega("DS_ENDERECO"),
      bairro: pega("NM_BAIRRO"),
      cep: pega("NR_CEP"),
      municipio: pega("NM_MUNICIPIO"),
      codigoMunicipioTse: pega("CD_MUNICIPIO"),
      latitude: numero(campos[idx.NR_LATITUDE]),
      longitude: numero(campos[idx.NR_LONGITUDE]),
      qtEleitores: pega("QT_ELEITOR_SECAO") ? Number(pega("QT_ELEITOR_SECAO")) : null,
    });
  }

  console.log(`linhas lidas no arquivo: ${totalLinhas.toLocaleString("pt-BR")}`);
  console.log(`registros de ${MUNICIPIO_ALVO}/${UF_ALVO}: ${registros.length.toLocaleString("pt-BR")}`);
  console.log(`\neleicoes presentes:\n  ${[...eleicoesVistas].join("\n  ")}\n`);

  if (!registros.length) {
    console.error("Nenhum registro encontrado. Confira o arquivo de entrada.");
    process.exit(1);
  }

  // --- deduplica por (zona, secao), mantendo o registro do turno mais recente ---
  const porSecao = new Map();
  const turnosPorSecao = new Map();
  for (const r of registros) {
    const chave = `${r.zona}-${r.secao}`;
    const anterior = porSecao.get(chave);
    if (!anterior || (r.turno ?? 0) >= (anterior.turno ?? 0)) porSecao.set(chave, r);

    const t = turnosPorSecao.get(chave) ?? new Set();
    if (r.turno) t.add(r.turno);
    turnosPorSecao.set(chave, t);
  }

  const secoes = [...porSecao.entries()]
    .map(([chave, r]) => ({
      ...r,
      turnos: [...(turnosPorSecao.get(chave) ?? [])].sort((a, b) => a - b),
    }))
    .sort((a, b) => (a.zona !== b.zona ? a.zona - b.zona : a.secao - b.secao));

  // --- lacunas: o que a fonte NAO traz. Nada aqui e preenchido por estimativa ---
  const semBairro = secoes.filter((s) => !s.bairro);
  const semEndereco = secoes.filter((s) => !s.endereco);
  const semCoordenada = secoes.filter((s) => s.latitude == null || s.longitude == null);

  // --- agrupamento por bairro, direto do campo NM_BAIRRO do TSE ---
  const bairros = new Map();
  for (const s of secoes) {
    if (!s.bairro) continue;
    const b = bairros.get(s.bairro) ?? {
      bairro: s.bairro,
      secoes: [],
      locais: new Set(),
      eleitores: 0,
    };
    b.secoes.push({ zona: s.zona, secao: s.secao });
    b.locais.add(s.localNome);
    b.eleitores += s.qtEleitores ?? 0;
    bairros.set(s.bairro, b);
  }

  const resumoBairros = [...bairros.values()]
    .map((b) => ({
      bairro: b.bairro,
      qtdSecoes: b.secoes.length,
      qtdLocais: b.locais.size,
      eleitores: b.eleitores,
      locais: [...b.locais].sort(),
      secoes: b.secoes,
    }))
    .sort((a, b) => b.eleitores - a.eleitores);

  const locais = new Map();
  for (const s of secoes) {
    const chave = `${s.zona}-${s.localCodigo}`;
    if (!locais.has(chave)) {
      locais.set(chave, {
        zona: s.zona,
        codigo: s.localCodigo,
        nome: s.localNome,
        endereco: s.endereco,
        bairro: s.bairro,
        cep: s.cep,
        tipoLocal: s.tipoLocal,
        latitude: s.latitude,
        longitude: s.longitude,
        secoes: [],
        eleitores: 0,
      });
    }
    const l = locais.get(chave);
    l.secoes.push(s.secao);
    l.eleitores += s.qtEleitores ?? 0;
  }

  const saida = {
    fonte: {
      orgao: "Tribunal Superior Eleitoral (TSE) - dados abertos",
      conjunto: "Eleitorado / Locais de votacao",
      url: "https://cdn.tse.jus.br/estatistica/sead/odsele/eleitorado_locais_votacao/",
      arquivo: csv.split(/[\\/]/).pop(),
      eleicoes: [...eleicoesVistas],
    },
    metodo:
      "O bairro de cada secao vem do campo NM_BAIRRO publicado pelo TSE. Nenhum valor " +
      "foi geocodificado, estimado ou inferido. Campos ausentes na fonte aparecem como " +
      "null e estao contabilizados em 'lacunas'.",
    municipio: MUNICIPIO_ALVO,
    uf: UF_ALVO,
    codigoIbge: "3503208",
    extraidoEm: new Date().toISOString().slice(0, 10),
    totais: {
      secoes: secoes.length,
      locaisDeVotacao: locais.size,
      bairrosDistintos: resumoBairros.length,
      eleitoradoTotal: secoes.reduce((s, r) => s + (r.qtEleitores ?? 0), 0),
      zonasEleitorais: [...new Set(secoes.map((s) => s.zona))].sort((a, b) => a - b),
    },
    lacunas: {
      secoesSemBairro: semBairro.length,
      secoesSemEndereco: semEndereco.length,
      secoesSemCoordenada: semCoordenada.length,
      detalheSemBairro: semBairro.map((s) => ({ zona: s.zona, secao: s.secao, local: s.localNome })),
    },
    bairros: resumoBairros,
    locais: [...locais.values()].sort((a, b) =>
      a.zona !== b.zona ? a.zona - b.zona : String(a.codigo).localeCompare(String(b.codigo)),
    ),
    secoes,
  };

  mkdirSync(resolve(__dirname, "..", "src", "dados"), { recursive: true });
  const destinoJson = resolve(__dirname, "..", "src", "dados", "secoes-araraquara.json");
  writeFileSync(destinoJson, JSON.stringify(saida, null, 1));

  // CSV achatado, uma linha por secao, para conferencia manual
  const colunasCsv = [
    "zona", "secao", "local_codigo", "local_nome", "endereco", "bairro", "cep",
    "latitude", "longitude", "eleitores", "turnos",
  ];
  const csvSaida = [
    colunasCsv.join(";"),
    ...secoes.map((s) =>
      [
        s.zona, s.secao, s.localCodigo ?? "", s.localNome ?? "", s.endereco ?? "",
        s.bairro ?? "", s.cep ?? "", s.latitude ?? "", s.longitude ?? "",
        s.qtEleitores ?? "", s.turnos.join("+"),
      ]
        .map((v) => (String(v).includes(";") ? `"${v}"` : v))
        .join(";"),
    ),
  ].join("\n");
  const destinoCsv = resolve(__dirname, "..", "src", "dados", "secoes-araraquara.csv");
  writeFileSync(destinoCsv, csvSaida, "latin1");

  // --------------------------------------------------------------- relatorio
  console.log(`secoes unicas: ${secoes.length}`);
  console.log(`locais de votacao: ${locais.size}`);
  console.log(`zonas eleitorais: ${saida.totais.zonasEleitorais.join(", ")}`);
  console.log(`bairros distintos (campo NM_BAIRRO do TSE): ${resumoBairros.length}\n`);

  console.log("lacunas da fonte (NAO preenchidas por estimativa):");
  console.log(`  secoes sem bairro:     ${semBairro.length}`);
  console.log(`  secoes sem endereco:   ${semEndereco.length}`);
  console.log(`  secoes sem coordenada: ${semCoordenada.length}\n`);

  console.log(`eleitorado total (soma de QT_ELEITOR_SECAO): ${saida.totais.eleitoradoTotal.toLocaleString("pt-BR")}\n`);

  console.log("bairros, por eleitorado:");
  for (const b of resumoBairros) {
    console.log(
      `  ${b.eleitores.toLocaleString("pt-BR").padStart(7)} eleitores  ` +
        `${String(b.qtdSecoes).padStart(3)} secoes  ${String(b.qtdLocais).padStart(2)} locais  ${b.bairro}`,
    );
  }

  console.log(`\n-> ${destinoJson}`);
  console.log(`-> ${destinoCsv}`);
}

main();
