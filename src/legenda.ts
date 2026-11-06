/**
 * Monta as linhas da legenda a partir de uma metrica.
 *
 * Forma fixa, como manda o design system: escala divergente ocupa duas linhas
 * de 5 celulas (a de cima e um polo, a de baixo o outro) e escala sequencial
 * uma linha de 5. Nas duas linhas da divergente as celulas correm do zero
 * para fora, de modo que a intensidade cresce no mesmo sentido.
 */

import { bairros, locais } from "./dados/modelo";
import { corCss, FAIXAS_POR_LADO, indiceDaFaixa } from "./escalas";
import type { LinhaLegenda } from "./componentes/grade";
import type { Metrica } from "./metricas";

/** Quantos bairros caem em cada faixa, na ordem do array de faixas. */
function contarPorFaixa(metrica: Metrica): number[] {
  const contagem = new Array(metrica.faixas.length).fill(0);
  for (const b of bairros) {
    contagem[indiceDaFaixa(metrica.faixas, metrica.valor(b))]++;
  }
  return contagem;
}

/** Quantos locais com eleitorado caem em cada faixa (para saber se esta vazia). */
function contarLocais(metrica: Metrica): number[] {
  const contagem = new Array(metrica.faixas.length).fill(0);
  for (const l of locais) {
    if (l.eleitorado > 0) contagem[indiceDaFaixa(metrica.faixas, metrica.valor(l))]++;
  }
  return contagem;
}

export function linhasDaLegenda(metrica: Metrica): LinhaLegenda[] {
  const porBairro = contarPorFaixa(metrica);
  const porLocal = contarLocais(metrica);
  const f = metrica.formatoCurto;
  const passo = metrica.passo;

  // o numero mostrado e de bairros; esmaecer so quando nao ha bairro NEM local
  const celula = (indice: number, range: string) => ({
    color: corCss(metrica.faixas[indice].corVar),
    count: porBairro[indice],
    range,
    vazia: porBairro[indice] === 0 && porLocal[indice] === 0,
  });

  if (metrica.legenda.tipo === "divergente") {
    const lado = (positivo: boolean) =>
      Array.from({ length: FAIXAS_POR_LADO }, (_, j) => {
        const indice = positivo ? FAIXAS_POR_LADO + j : FAIXAS_POR_LADO - 1 - j;
        const sinal = positivo ? "+" : "−";
        const a = j * passo;
        const b = (j + 1) * passo;
        const range =
          j === FAIXAS_POR_LADO - 1
            ? positivo
              ? `${sinal}${f(a)} ou mais`
              : `ate ${sinal}${f(a)}`
            : `${j === 0 ? "0" : sinal + f(a)} a ${sinal}${f(b)}`;
        return celula(indice, range);
      });

    return [
      { label: `↑ ${metrica.legenda.poloPos}`, cells: lado(true) },
      { label: `↓ ${metrica.legenda.poloNeg}`, cells: lado(false) },
    ];
  }

  const cortes = metrica.faixas.slice(0, -1).map((x) => x.max);
  return [
    {
      label: `menor → maior`,
      cells: metrica.faixas.map((faixa, j) =>
        celula(
          j,
          j === 0
            ? `ate ${f(cortes[0])}`
            : j === metrica.faixas.length - 1
              ? `${f(faixa.min)} ou mais`
              : `${f(faixa.min)} a ${f(faixa.max)}`,
        ),
      ),
    },
  ];
}
