/**
 * Modelo de dados. TUDO AQUI VEM DO TSE.
 *
 *   votacao-real.json  -> apuracao por bairro e por local (votacao_secao_2026_BR)
 *   municipio.json     -> limite municipal (IBGE, malha 2022, codigo 3503208)
 *
 * Nenhum numero e estimado. Os unicos elementos de apresentacao introduzidos
 * aqui sao a COR de cada candidato e um APELIDO curto para caber na interface;
 * o nome como o TSE publica e o numero de urna ficam sempre disponiveis.
 */

import base from "./votacao-real.json";
import municipioGeo from "./municipio.json";

// ---------------------------------------------------------------- tipos base

export interface Candidato {
  id: string;
  numero: string;
  /** nome exatamente como o TSE publica */
  nomeTse: string;
  /** rotulo curto, so para a interface */
  nome: string;
  cor: string;
  votos1: number;
  votos2: number;
  /** disputou o 2o turno */
  finalista: boolean;
}

export interface TurnoBruto {
  comparecimento: number;
  validos: number;
  brancos: number;
  nulos: number;
  abstencoes: number;
  votos: Record<string, number>;
}

export interface MetricasTurno {
  comparecimento: number;
  validos: number;
  brancos: number;
  nulos: number;
  abstencoes: number;
  abstencaoPct: number;
  brancoNuloPct: number;
  votos: Record<string, number>;
  pct: Record<string, number>;
  votosA: number;
  votosB: number;
  pctA: number;
  pctB: number;
  /** share de A sobre A+B, ignorando as demais chapas */
  pctA2p: number;
  pctB2p: number;
  vantagem2p: number;
  /** pctA - pctB sobre o total de validos */
  vantagem: number;
  vencedor: string;
}

export interface Unidade {
  id: string;
  nome: string;
  eleitorado: number;
  qtdSecoes: number;
  t1: MetricasTurno;
  t2: MetricasTurno;
  /** deslocamento no voto a dois, em pontos percentuais */
  swing2p: number;
  /** deslocamento descontada a media do municipio */
  swingRelativo: number;
  deltaVotosA: number;
  deltaVotosB: number;
  crescA: number;
  crescB: number;
  deltaComparecimento: number;
  virou: boolean;
}

export interface Bairro extends Unidade {}

export interface Local extends Unidade {
  zona: number | null;
  codigo: string | null;
  endereco: string | null;
  bairro: string | null;
  /** id do bairro, para casar com a lista de bairros */
  bairroId: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
}

// ------------------------------------------------------------ apresentacao

/**
 * Apelido e cor por numero de urna. E a UNICA camada de apresentacao sobre o
 * dado do TSE: nao altera voto nenhum, so encurta o rotulo e escolhe a cor.
 */
const APRESENTACAO: Record<string, { nome: string; cor: string }> = {
  "13": { nome: "Lula", cor: "#d92b3a" },
  "22": { nome: "Flavio Bolsonaro", cor: "#1f4e9c" },
  "70": { nome: "Augusto Cury", cor: "#e8862a" },
  "14": { nome: "Renan Santos", cor: "#7b56c4" },
  "55": { nome: "Ronaldo Caiado", cor: "#13a89e" },
  "30": { nome: "Romeu Zema", cor: "#2f9e44" },
};

const PALETA_RESERVA = ["#8a8f98", "#a2704a", "#b0536f", "#5a7d9a", "#7d8a3c", "#9c6b9e"];

function tituloCaso(nome: string) {
  const minusculas = new Set(["da", "de", "do", "das", "dos", "e"]);
  return nome
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/)
    .map((p, i) =>
      i > 0 && minusculas.has(p) ? p : p.charAt(0).toLocaleUpperCase("pt-BR") + p.slice(1),
    )
    .join(" ");
}

// ------------------------------------------------------------------ candidatos

interface CandidatoBruto {
  id: string;
  nr: string;
  nome: string;
  votos1: number;
  votos2: number;
}

export const candidatos: Candidato[] = (base.candidatos as CandidatoBruto[])
  .map((c, i) => {
    const apres = APRESENTACAO[c.nr];
    return {
      id: c.id,
      numero: c.nr,
      nomeTse: c.nome,
      nome: apres?.nome ?? tituloCaso(c.nome),
      cor: apres?.cor ?? PALETA_RESERVA[i % PALETA_RESERVA.length],
      votos1: c.votos1,
      votos2: c.votos2,
      finalista: c.votos2 > 0,
    };
  })
  .sort((a, b) => b.votos1 - a.votos1);

export const finalistas = candidatos
  .filter((c) => c.finalista)
  .sort((a, b) => b.votos2 - a.votos2);

if (finalistas.length !== 2) {
  throw new Error(
    `Esperava 2 finalistas no 2o turno, encontrei ${finalistas.length}. ` +
      `Confira src/dados/votacao-real.json.`,
  );
}

/** A = quem fez mais votos no 2o turno no municipio. B = o outro. */
export const candA = finalistas[0];
export const candB = finalistas[1];

export const ordemPrimeiroTurno = candidatos.filter((c) => c.votos1 > 0).map((c) => c.id);

const porNumeroMapa = new Map(candidatos.map((c) => [c.numero, c]));

/** Apresentacao (nome curto + cor) a partir do numero de urna. */
export function porNumero(numero: string, nomeTse?: string): Candidato {
  const achado = porNumeroMapa.get(numero);
  if (achado) return achado;
  const apres = APRESENTACAO[numero];
  return {
    id: numero,
    numero,
    nomeTse: nomeTse ?? numero,
    nome: apres?.nome ?? (nomeTse ? tituloCaso(nomeTse) : numero),
    cor: apres?.cor ?? "#8a8f98",
    votos1: 0,
    votos2: 0,
    finalista: false,
  };
}

const porId = new Map(candidatos.map((c) => [c.id, c]));
export function porCandidato(id: string): Candidato {
  return (
    porId.get(id) ?? {
      id,
      numero: "?",
      nomeTse: id,
      nome: id,
      cor: "#8a8f98",
      votos1: 0,
      votos2: 0,
      finalista: false,
    }
  );
}

// ------------------------------------------------------------------- calculo

function metricas(t: TurnoBruto, eleitorado: number): MetricasTurno {
  const pct: Record<string, number> = {};
  for (const [id, v] of Object.entries(t.votos)) {
    pct[id] = t.validos > 0 ? (v / t.validos) * 100 : 0;
  }
  const votosA = t.votos[candA.id] ?? 0;
  const votosB = t.votos[candB.id] ?? 0;
  const dois = votosA + votosB;

  return {
    comparecimento: t.comparecimento,
    validos: t.validos,
    brancos: t.brancos,
    nulos: t.nulos,
    abstencoes: t.abstencoes,
    abstencaoPct: eleitorado > 0 ? (t.abstencoes / eleitorado) * 100 : 0,
    brancoNuloPct: t.comparecimento > 0 ? ((t.brancos + t.nulos) / t.comparecimento) * 100 : 0,
    votos: t.votos,
    pct,
    votosA,
    votosB,
    pctA: pct[candA.id] ?? 0,
    pctB: pct[candB.id] ?? 0,
    pctA2p: dois > 0 ? (votosA / dois) * 100 : 0,
    pctB2p: dois > 0 ? (votosB / dois) * 100 : 0,
    vantagem2p: dois > 0 ? ((votosA - votosB) / dois) * 100 : 0,
    vantagem: (pct[candA.id] ?? 0) - (pct[candB.id] ?? 0),
    vencedor: votosA >= votosB ? candA.id : candB.id,
  };
}

function montaUnidade<T extends { id: string; nome: string; eleitorado: number; qtdSecoes: number }>(
  bruto: T & { turno1: TurnoBruto; turno2: TurnoBruto },
): Unidade {
  const t1 = metricas(bruto.turno1, bruto.eleitorado);
  const t2 = metricas(bruto.turno2, bruto.eleitorado);
  return {
    id: bruto.id,
    nome: bruto.nome,
    eleitorado: bruto.eleitorado,
    qtdSecoes: bruto.qtdSecoes,
    t1,
    t2,
    swing2p: t2.pctA2p - t1.pctA2p,
    swingRelativo: 0, // preenchido depois que os totais existirem
    deltaVotosA: t2.votosA - t1.votosA,
    deltaVotosB: t2.votosB - t1.votosB,
    crescA: t1.votosA > 0 ? ((t2.votosA - t1.votosA) / t1.votosA) * 100 : 0,
    crescB: t1.votosB > 0 ? ((t2.votosB - t1.votosB) / t1.votosB) * 100 : 0,
    deltaComparecimento: t2.comparecimento - t1.comparecimento,
    virou: t1.vencedor !== t2.vencedor,
  };
}

// ------------------------------------------------------------------ bairros

type BairroBruto = {
  id: string;
  nome: string;
  eleitorado: number;
  qtdSecoes: number;
  turno1: TurnoBruto;
  turno2: TurnoBruto;
};

export const bairros: Bairro[] = (base.bairros as BairroBruto[])
  .map((b) => ({ ...montaUnidade(b), nome: tituloCaso(b.nome) }))
  .sort((a, b) => b.eleitorado - a.eleitorado);

export const bairroPorId = new Map(bairros.map((b) => [b.id, b]));

// ------------------------------------------------------------------- locais

type LocalBruto = BairroBruto & {
  zona: number | null;
  codigo: string | null;
  endereco: string | null;
  bairro: string | null;
  bairroId: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
};

export const locais: Local[] = (base.locais as LocalBruto[])
  .map((l) => ({
    ...montaUnidade(l),
    nome: l.nome ? tituloCaso(l.nome) : "(sem nome)",
    zona: l.zona,
    codigo: l.codigo,
    endereco: l.endereco ? tituloCaso(l.endereco) : null,
    bairro: l.bairro ? tituloCaso(l.bairro) : null,
    bairroId: l.bairroId,
    cep: l.cep,
    latitude: l.latitude,
    longitude: l.longitude,
  }))
  .sort((a, b) => b.eleitorado - a.eleitorado);

export const localPorId = new Map(locais.map((l) => [l.id, l]));

/** Locais com coordenada publicada: os unicos que podem ir ao mapa. */
export const locaisGeolocalizados = locais.filter(
  (l) => l.latitude != null && l.longitude != null,
);
export const locaisSemCoordenada = locais.filter(
  (l) => l.latitude == null || l.longitude == null,
);

// ------------------------------------------------------------------- totais

function soma(sel: (u: Unidade) => MetricasTurno, eleitorado: number): MetricasTurno {
  const votos: Record<string, number> = {};
  let comparecimento = 0, validos = 0, brancos = 0, nulos = 0, abstencoes = 0;
  for (const b of bairros) {
    const t = sel(b);
    comparecimento += t.comparecimento;
    validos += t.validos;
    brancos += t.brancos;
    nulos += t.nulos;
    abstencoes += t.abstencoes;
    for (const [id, v] of Object.entries(t.votos)) votos[id] = (votos[id] ?? 0) + v;
  }
  return metricas({ comparecimento, validos, brancos, nulos, abstencoes, votos }, eleitorado);
}

export const eleitoradoTotal = bairros.reduce((s, b) => s + b.eleitorado, 0);

export const totais = {
  eleitorado: eleitoradoTotal,
  t1: soma((u) => u.t1, eleitoradoTotal),
  t2: soma((u) => u.t2, eleitoradoTotal),
};

export const swingMunicipio = {
  doisPartidos: totais.t2.pctA2p - totais.t1.pctA2p,
  deltaVotosA: totais.t2.votosA - totais.t1.votosA,
  deltaVotosB: totais.t2.votosB - totais.t1.votosB,
  deltaComparecimento: totais.t2.comparecimento - totais.t1.comparecimento,
};

for (const u of [...bairros, ...locais]) {
  u.swingRelativo = u.swing2p - swingMunicipio.doisPartidos;
}

// ------------------------------------------------------------------ geografia

export const municipio = municipioGeo as unknown as GeoJSON.FeatureCollection;

// ----------------------------------------------------------------- metadados

export const meta = {
  simulado: base.SIMULADO as boolean,
  fonte: base.fonte as {
    orgao: string;
    conjuntos: string[];
    url: string;
    arquivo: string;
  },
  metodo: base.metodo as string,
  ressalva: base.ressalva as string,
  notaSecoesAgregadas: base.notaSecoesAgregadas as string,
  municipio: base.municipio as string,
  /** nome formatado para exibicao, ex. "Araraquara - SP" */
  municipioExibicao: `${tituloCaso(base.municipio as string)} – ${base.uf as string}`,
  uf: base.uf as string,
  codigoIbge: base.codigoIbge as string,
  pleito: base.pleito as string,
  extraidoEm: base.extraidoEm as string,
  datas: { turno1: "04/10/2026", turno2: "25/10/2026" },
};

// ------------------------------------------------------------------ formato

export const fmtInt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

export const fmtPct = (n: number, dec = 1) =>
  `${n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec })}%`;

export const fmtSinal = (n: number, dec = 1) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("pt-BR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })}`;

export const fmtSinalInt = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmtInt(Math.abs(n))}`;
