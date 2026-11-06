/**
 * Dados nacionais por municipio, para a aba de insights.
 *
 * Carregado SOB DEMANDA de /municipios-brasil.json: sao ~5,5 mil municipios e
 * nao faz sentido pesar o bundle principal com eles quando a pagina abre no
 * mapa de Araraquara.
 *
 * Tudo vem do TSE (votacao_secao_2026_BR, cargo Presidente). Nenhum valor e
 * estimado.
 */

export interface MunicipioBruto {
  cd: string;
  nome: string;
  uf: string;
  /** votos do candidato A no 1o e 2o turno */
  a1: number;
  a2: number;
  /** votos do candidato B no 1o e 2o turno */
  b1: number;
  b2: number;
  /** votos validos em cada turno */
  v1: number;
  v2: number;
  /** comparecimento em cada turno */
  c1: number;
  c2: number;
  /** share de A no voto a dois, em cada turno */
  p1: number;
  p2: number;
}

export interface BaseMunicipios {
  fonte: { orgao: string; conjunto: string; url: string };
  pleito: string;
  datas: { turno1: string; turno2: string };
  extraidoEm: string;
  candidatos: {
    A: { numero: string; nomeTse: string };
    B: { numero: string; nomeTse: string };
  };
  totais: {
    municipios: number;
    a1: number; b1: number; a2: number; b2: number; v1: number; v2: number;
  };
  municipios: MunicipioBruto[];
}

/** Um municipio com as medidas de crescimento ja calculadas. */
export interface Municipio extends MunicipioBruto {
  /** variacao absoluta de votos entre os turnos */
  deltaA: number;
  deltaB: number;
  /** crescimento relativo, em %, sobre os votos do 1o turno */
  crescA: number;
  crescB: number;
  /** deslocamento no voto a dois, em pontos percentuais (positivo = para A) */
  swing: number;
  /** o mesmo deslocamento, descontada a media nacional */
  swingRelativo: number;
  /** variacao do comparecimento */
  deltaComparecimento: number;
  /** quem venceu em cada turno: "A" ou "B" */
  vence1: "A" | "B";
  vence2: "A" | "B";
  virou: boolean;
}

export interface DadosNacionais {
  base: BaseMunicipios;
  municipios: Municipio[];
  /** deslocamento nacional no voto a dois */
  swingNacional: number;
  ufs: string[];
  /** codigo TSE de Araraquara, para destacar a cidade nas listas */
  cdDestaque: string | null;
}

/** O municipio que a aplicacao acompanha, destacado em todas as listas. */
export const NOME_DESTAQUE = "ARARAQUARA";
export const UF_DESTAQUE = "SP";

let promessa: Promise<DadosNacionais> | null = null;

/** Carrega (uma vez) e prepara os dados nacionais. */
export function carregarMunicipios(): Promise<DadosNacionais> {
  if (!promessa) {
    promessa = fetch(`${import.meta.env.BASE_URL}municipios-brasil.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Nao consegui carregar os dados nacionais (HTTP ${r.status})`);
        return r.json() as Promise<BaseMunicipios>;
      })
      .then(prepara);
  }
  return promessa;
}

function prepara(base: BaseMunicipios): DadosNacionais {
  const t = base.totais;
  const dois1 = t.a1 + t.b1;
  const dois2 = t.a2 + t.b2;
  const swingNacional =
    (dois2 > 0 ? (t.a2 / dois2) * 100 : 0) - (dois1 > 0 ? (t.a1 / dois1) * 100 : 0);

  const municipios: Municipio[] = base.municipios.map((m) => {
    const swing = m.p2 - m.p1;
    return {
      ...m,
      deltaA: m.a2 - m.a1,
      deltaB: m.b2 - m.b1,
      crescA: m.a1 > 0 ? ((m.a2 - m.a1) / m.a1) * 100 : Number.NaN,
      crescB: m.b1 > 0 ? ((m.b2 - m.b1) / m.b1) * 100 : Number.NaN,
      swing,
      swingRelativo: swing - swingNacional,
      deltaComparecimento: m.c2 - m.c1,
      vence1: m.a1 >= m.b1 ? "A" : "B",
      vence2: m.a2 >= m.b2 ? "A" : "B",
      virou: (m.a1 >= m.b1) !== (m.a2 >= m.b2),
    };
  });

  const destaque = municipios.find(
    (m) => m.nome.toUpperCase() === NOME_DESTAQUE && m.uf === UF_DESTAQUE,
  );

  return {
    base,
    municipios,
    swingNacional,
    ufs: [...new Set(municipios.map((m) => m.uf))].sort(),
    cdDestaque: destaque?.cd ?? null,
  };
}
