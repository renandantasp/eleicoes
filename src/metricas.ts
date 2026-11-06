/**
 * Metricas que o mapa e a tabela podem pintar, nas tres visualizacoes:
 * 1o turno, 2o turno e diferenca entre turnos.
 *
 * Tudo calculado sobre a apuracao do TSE. "A" e "B" sao os dois finalistas,
 * lidos do proprio arquivo (A = quem venceu o 2o turno no municipio).
 *
 * Quatro decisoes valem para o arquivo inteiro:
 *
 *  1. As faixas de uma mesma medida sao COMPARTILHADAS entre o 1o e o 2o
 *     turno: trocar de aba nao reorganiza a legenda.
 *  2. A paleta das chapas so aparece em metrica que opoe os dois candidatos.
 *     Comparecimento nao tem lado, entao usa ambar e verde-azulado.
 *  3. Cada metrica declara a sua FONTE no TSE, mostrada no rodape da legenda.
 *  4. As casas decimais dos cortes saem do passo da escala.
 */

import type { Unidade } from "./dados/modelo";
import { bairros, candA, candB, fmtPct, fmtSinal, fmtSinalInt, locais } from "./dados/modelo";
import {
  corNaFaixa,
  decimaisDoPasso,
  faixasDivergentes,
  faixasSequenciais,
  type Faixa,
  type Rampa,
} from "./escalas";

export type Vista = "t1" | "t2" | "dif";

export interface Metrica {
  id: string;
  rotulo: string;
  /** unidade por extenso, mostrada como etiqueta no cabecalho da legenda */
  unidade: string;
  descricao: string;
  /** arquivo e campo do TSE de onde o numero sai */
  fonte: string;
  valor: (u: Unidade) => number;
  /** valor com unidade, para tooltips e texto corrido */
  formato: (v: number) => string;
  /** valor sem unidade, para os cortes da legenda */
  formatoCurto: (v: number) => string;
  faixas: Faixa[];
  passo: number;
  /** token da cor da faixa em que o valor cai */
  cor: (v: number) => string;
  legenda:
    | { tipo: "divergente"; poloPos: string; poloNeg: string }
    | { tipo: "sequencial"; polo: string };
}

/**
 * Unidades que entram no calculo das escalas: bairros e locais com eleitorado.
 * A Penitenciaria de Araraquara tem 0 eleitores neste pleito, entao todos os
 * seus percentuais sao 0 por definicao.
 */
const UNIDADES_ESCALA: Unidade[] = [...bairros, ...locais].filter((u) => u.eleitorado > 0);

function quantil(valores: number[], q: number): number {
  if (!valores.length) return 0;
  const v = [...valores].sort((a, b) => a - b);
  const i = (v.length - 1) * Math.min(1, Math.max(0, q));
  const baixo = Math.floor(i);
  const alto = Math.ceil(i);
  return v[baixo] + (v[alto] - v[baixo]) * (i - baixo);
}

/** Rampa de cada chapa, espelhando as cores de APRESENTACAO em modelo.ts. */
const RAMPA_POR_NUMERO: Record<string, Rampa> = { "13": "red", "22": "blue" };
const rampaA: Rampa = RAMPA_POR_NUMERO[candA.numero] ?? "red";
const rampaB: Rampa = RAMPA_POR_NUMERO[candB.numero] ?? "blue";

function limiteDivergente(acessores: ((u: Unidade) => number)[], piso: number): number {
  const vs = UNIDADES_ESCALA.flatMap((u) => acessores.map((a) => Math.abs(a(u))));
  return Math.max(piso, quantil(vs, 0.95));
}

/**
 * Escala divergente a partir de um ou mais acessores. Passando as versoes de
 * 1o e 2o turno da mesma medida, os dois mapas usam as mesmas faixas.
 *
 * O limite e robusto - percentil 95 do valor absoluto, nao o maximo - para que
 * um unico local extremo nao comprima todos os bairros em duas ou tres faixas.
 */
function escalaDivergente(
  acessores: ((u: Unidade) => number)[],
  piso: number,
  rampaPos: Rampa,
  rampaNeg: Rampa,
) {
  return faixasDivergentes(limiteDivergente(acessores, piso), rampaPos, rampaNeg);
}

/** Escala sequencial compartilhada; amplitude pelos percentis 2 e 98. */
function escalaSequencial(acessores: ((u: Unidade) => number)[], rampa: Rampa) {
  const vs = UNIDADES_ESCALA.flatMap((u) => acessores.map((a) => a(u)));
  return faixasSequenciais(quantil(vs, 0.02), quantil(vs, 0.98), rampa);
}

// ---------------------------------------------------------------------------
// Escalas, definidas uma unica vez por familia de medida.
// ---------------------------------------------------------------------------

const LIMITE_DELTA_VOTOS = limiteDivergente([(u) => u.deltaVotosA, (u) => u.deltaVotosB], 100);

const E = {
  vantagem: escalaDivergente([(u) => u.t1.vantagem, (u) => u.t2.vantagem], 10, rampaA, rampaB),
  pctA: escalaSequencial([(u) => u.t1.pctA, (u) => u.t2.pctA], rampaA),
  pctB: escalaSequencial([(u) => u.t1.pctB, (u) => u.t2.pctB], rampaB),
  abstencao: escalaSequencial([(u) => u.t1.abstencaoPct, (u) => u.t2.abstencaoPct], "green"),
  brancoNulo: escalaSequencial([(u) => u.t1.brancoNuloPct, (u) => u.t2.brancoNuloPct], "green"),

  swingRelativo: escalaDivergente([(u) => u.swingRelativo], 2, rampaA, rampaB),
  swing: escalaDivergente([(u) => u.swing2p], 2, rampaA, rampaB),
  // mesmos cortes para os dois candidatos, invertendo so a cor
  deltaVotosA: faixasDivergentes(LIMITE_DELTA_VOTOS, rampaA, rampaB),
  deltaVotosB: faixasDivergentes(LIMITE_DELTA_VOTOS, rampaB, rampaA),
  // comparecimento nao e partidario: ambar (caiu) e verde-azulado (subiu)
  comparecimento: escalaDivergente([(u) => u.deltaComparecimento], 100, "teal", "amber"),
};

// ---------------------------------------------------------------------------

const FONTE_VOTOS = "votacao_secao_2026_BR · QT_VOTOS";
const FONTE_ELEITORADO = "eleitorado_local_votacao_2026 · QT_ELEITOR_SECAO";
const FONTE_BN = "votacao_secao_2026_BR · NR_VOTAVEL 95 e 96";

type TipoFormato = "pp" | "pct" | "contagem";

/**
 * As casas decimais dos CORTES saem do passo da escala, como pede o design
 * system: com passo 0,25 a faixa e escrita "+0,25 a +0,50". Ja o VALOR de uma
 * area mantem pelo menos uma casa, senao um passo de 5 arredondaria "-7,4 pp"
 * para "-7 pp" no mapa e na tabela.
 */
function formatos(tipo: TipoFormato, passo: number) {
  const casas = decimaisDoPasso(passo);
  const casasValor = Math.max(1, casas);
  const num = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

  if (tipo === "contagem") {
    return { completo: fmtSinalInt, curto: fmtSinalInt };
  }
  if (tipo === "pp") {
    return {
      completo: (v: number) => `${fmtSinal(v, casasValor)} pp`,
      curto: (v: number) => fmtSinal(v, casas),
    };
  }
  return { completo: (v: number) => fmtPct(v, casasValor), curto: num };
}

function divergente(
  id: string,
  rotulo: string,
  unidade: string,
  descricao: string,
  fonte: string,
  valor: (u: Unidade) => number,
  escala: { faixas: Faixa[]; passo: number },
  tipo: TipoFormato,
  poloPos: string,
  poloNeg: string,
): Metrica {
  const f = formatos(tipo, escala.passo);
  return {
    id,
    rotulo,
    unidade,
    descricao,
    fonte,
    valor,
    formato: f.completo,
    formatoCurto: f.curto,
    faixas: escala.faixas,
    passo: escala.passo,
    cor: (v) => corNaFaixa(escala.faixas, v),
    legenda: { tipo: "divergente", poloPos, poloNeg },
  };
}

function sequencial(
  id: string,
  rotulo: string,
  unidade: string,
  descricao: string,
  fonte: string,
  valor: (u: Unidade) => number,
  escala: { faixas: Faixa[]; passo: number },
  polo: string,
): Metrica {
  const f = formatos("pct", escala.passo);
  return {
    id,
    rotulo,
    unidade,
    descricao,
    fonte,
    valor,
    formato: f.completo,
    formatoCurto: f.curto,
    faixas: escala.faixas,
    passo: escala.passo,
    cor: (v) => corNaFaixa(escala.faixas, v),
    legenda: { tipo: "sequencial", polo },
  };
}

/** Conjunto de metricas de um turno, com as faixas compartilhadas. */
function metricasDeTurno(turno: "t1" | "t2"): Metrica[] {
  const n = turno === "t1" ? "1o" : "2o";
  const t = turno === "t1" ? (u: Unidade) => u.t1 : (u: Unidade) => u.t2;

  return [
    divergente(
      `${turno}-vantagem`,
      "Vantagem",
      "pp",
      `Percentual de ${candA.nome} menos o de ${candB.nome} no ${n} turno, sobre os votos validos.`,
      FONTE_VOTOS,
      (u) => t(u).vantagem,
      E.vantagem,
      "pp",
      `${candA.nome} a frente`,
      `${candB.nome} a frente`,
    ),
    sequencial(
      `${turno}-a`,
      `% ${candA.nome}`,
      "% dos validos",
      `Percentual de votos validos de ${candA.nome} no ${n} turno.`,
      FONTE_VOTOS,
      (u) => t(u).pctA,
      E.pctA,
      `votacao de ${candA.nome}`,
    ),
    sequencial(
      `${turno}-b`,
      `% ${candB.nome}`,
      "% dos validos",
      `Percentual de votos validos de ${candB.nome} no ${n} turno.`,
      FONTE_VOTOS,
      (u) => t(u).pctB,
      E.pctB,
      `votacao de ${candB.nome}`,
    ),
    sequencial(
      `${turno}-abstencao`,
      "Abstencao",
      "% do eleitorado",
      `Percentual do eleitorado que nao compareceu no ${n} turno.`,
      FONTE_ELEITORADO,
      (u) => t(u).abstencaoPct,
      E.abstencao,
      "abstencao",
    ),
    sequencial(
      `${turno}-bn`,
      "Brancos e nulos",
      "% do comparecimento",
      `Brancos mais nulos como percentual do comparecimento, no ${n} turno.`,
      FONTE_BN,
      (u) => t(u).brancoNuloPct,
      E.brancoNulo,
      "brancos e nulos",
    ),
  ];
}

export const METRICAS: Record<Vista, Metrica[]> = {
  t1: metricasDeTurno("t1"),
  t2: metricasDeTurno("t2"),
  dif: [
    divergente(
      "dif-relativo",
      "Vs. media da cidade",
      "pp",
      `Deslocamento da area menos o deslocamento medio do municipio. Como TODA Araraquara andou ` +
        `para ${candA.nome} entre os turnos, e esta medida que separa quem andou mais de quem andou menos.`,
      FONTE_VOTOS,
      (u) => u.swingRelativo,
      E.swingRelativo,
      "pp",
      `andou mais para ${candA.nome}`,
      `andou menos para ${candA.nome}`,
    ),
    divergente(
      "dif-swing2p",
      "Deslocamento",
      "pp no voto a dois",
      `Mudanca no voto a dois entre os turnos. Por ignorar as demais chapas, nao sofre o efeito ` +
        `mecanico de passar de treze candidatos para dois. Nenhuma area ficou negativa: o mapa ` +
        `inteiro andou para o mesmo lado.`,
      FONTE_VOTOS,
      (u) => u.swing2p,
      E.swing,
      "pp",
      `para ${candA.nome}`,
      `para ${candB.nome}`,
    ),
    divergente(
      "dif-votos-a",
      `Votos ganhos por ${candA.nome}`,
      "votos",
      `Votos que ${candA.nome} ganhou ou perdeu do 1o para o 2o turno. Mesmos cortes da metrica ` +
        `de ${candB.nome}, para que os dois sejam comparaveis.`,
      FONTE_VOTOS,
      (u) => u.deltaVotosA,
      E.deltaVotosA,
      "contagem",
      "ganhou votos",
      "perdeu votos",
    ),
    divergente(
      "dif-votos-b",
      `Votos ganhos por ${candB.nome}`,
      "votos",
      `Votos que ${candB.nome} ganhou ou perdeu do 1o para o 2o turno. Mesmos cortes da metrica ` +
        `de ${candA.nome}, para que os dois sejam comparaveis.`,
      FONTE_VOTOS,
      (u) => u.deltaVotosB,
      E.deltaVotosB,
      "contagem",
      "ganhou votos",
      "perdeu votos",
    ),
    divergente(
      "dif-comparecimento",
      "Mudanca no comparecimento",
      "eleitores",
      "Quantos eleitores a mais ou a menos compareceram no 2o turno. Nao e uma medida partidaria, " +
        "entao usa ambar e verde-azulado em vez das cores das chapas.",
      FONTE_VOTOS,
      (u) => u.deltaComparecimento,
      E.comparecimento,
      "contagem",
      "compareceram mais",
      "compareceram menos",
    ),
  ],
};

export const TITULOS: Record<Vista, { titulo: string; subtitulo: string }> = {
  t1: { titulo: "1o turno", subtitulo: "04 de outubro de 2026, com treze chapas na disputa" },
  t2: {
    titulo: "2o turno",
    subtitulo: `25 de outubro de 2026, no confronto ${candA.nome} x ${candB.nome}`,
  },
  dif: {
    titulo: "Diferenca entre turnos",
    subtitulo: "Para onde cada area da cidade se deslocou entre 4 e 25 de outubro",
  },
};
