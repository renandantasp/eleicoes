import {
  bairros,
  candA,
  candB,
  fmtInt,
  fmtPct,
  fmtSinal,
  fmtSinalInt,
  meta,
  ordemPrimeiroTurno,
  porCandidato,
  swingMunicipio,
  totais,
} from "../dados/modelo";
import type { Vista } from "../metricas";
import { Callout, CandidateBars, StatTile } from "./grade";

const tomDe = (id: string) => (id === candA.id ? "lula" : "flavio") as "lula" | "flavio";

/**
 * Barras das chapas no municipio inteiro, num turno. Vive na sub-aba de
 * graficos, onde o 1o e o 2o turno aparecem lado a lado em qualquer aba.
 */
export function GraficoChapas({ turno, topo = false }: { turno: "t1" | "t2"; topo?: boolean }) {
  const t = turno === "t2" ? totais.t2 : totais.t1;
  const data = turno === "t2" ? meta.datas.turno2 : meta.datas.turno1;

  const chapas = (turno === "t2" ? [candA.id, candB.id] : ordemPrimeiroTurno)
    .filter((id) => (t.votos[id] ?? 0) > 0)
    .map((id) => {
      const c = porCandidato(id);
      return {
        key: id,
        label: c.nome,
        number: c.numero,
        tseName: c.nomeTse,
        share: t.validos > 0 ? (t.votos[id] ?? 0) / t.validos : 0,
        color: `var(--ag-${id === candA.id ? "lula" : id === candB.id ? "flavio" : "outros"})`,
      };
    });

  return (
    <div className={topo ? "bloco bloco--topo" : "bloco"}>
      <div className="bloco__cab">
        <h3>
          Araraquara &mdash; {turno === "t1" ? "1o" : "2o"} turno, {data}
        </h3>
        <p className="bloco__nota">
          {turno === "t1"
            ? `As ${chapas.length} chapas da disputa, em percentual sobre os ${fmtInt(t.validos)} votos validos.`
            : `Os dois finalistas, em percentual sobre os ${fmtInt(t.validos)} votos validos.`}{" "}
          Nomes abreviados para a interface; o nome como o TSE publica aparece ao passar o mouse e na
          tabela de chapas em &ldquo;Sobre os dados&rdquo;.
        </p>
      </div>
      <div className="grafico-chapas">
        <CandidateBars items={chapas} />
      </div>
    </div>
  );
}

/** Cartoes de totais da cidade, no topo de cada aba de turno. */
export function Totais({ vista }: { vista: Vista }) {
  if (vista === "dif") {
    const viraram = bairros.filter((b) => b.virou);
    const andaramA = bairros.filter((b) => b.swing2p > 0).length;

    return (
      <>
        <div
          className="ag-grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
        >
          <StatTile
            label="Deslocamento da cidade"
            value={`${fmtSinal(swingMunicipio.doisPartidos)} pp`}
            note={`voto a dois: ${fmtPct(totais.t1.pctA2p)} para ${fmtPct(totais.t2.pctA2p)}`}
            tone={swingMunicipio.doisPartidos >= 0 ? "lula" : "flavio"}
          />
          <StatTile
            label={`Bairros que andaram para ${candA.nome}`}
            value={`${andaramA} de ${bairros.length}`}
            note={`os outros ${bairros.length - andaramA} andaram para ${candB.nome}`}
          />
          <StatTile
            label={`Votos ganhos por ${candA.nome}`}
            value={fmtSinalInt(swingMunicipio.deltaVotosA)}
            note={`${fmtInt(totais.t1.votosA)} para ${fmtInt(totais.t2.votosA)}`}
            tone="lula"
          />
          <StatTile
            label={`Votos ganhos por ${candB.nome}`}
            value={fmtSinalInt(swingMunicipio.deltaVotosB)}
            note={`${fmtInt(totais.t1.votosB)} para ${fmtInt(totais.t2.votosB)}`}
            tone="flavio"
          />
          <StatTile
            label="Bairros que mudaram de lado"
            value={`${viraram.length} de ${bairros.length}`}
            note={viraram.map((b) => b.nome).join(", ") || "nenhum"}
          />
          <StatTile
            label="Comparecimento"
            value={fmtSinalInt(swingMunicipio.deltaComparecimento)}
            note={`${fmtInt(totais.t1.comparecimento)} para ${fmtInt(totais.t2.comparecimento)}`}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <Callout>
            Os dois finalistas somam mais votos no 2o turno do que no 1o em parte porque as outras
            onze chapas sairam da disputa: {candA.nome} vai de {fmtPct(totais.t1.pctA)} para{" "}
            {fmtPct(totais.t2.pctA)} dos validos e {candB.nome}, de {fmtPct(totais.t1.pctB)} para{" "}
            {fmtPct(totais.t2.pctB)} &mdash; os dois sobem. Por isso a medida principal desta aba e o
            voto a dois, no painel: o share de cada um sobre a soma dos dois.
          </Callout>
        </div>
      </>
    );
  }

  const turno = vista === "t2" ? totais.t2 : totais.t1;
  const data = vista === "t2" ? meta.datas.turno2 : meta.datas.turno1;
  const vencedor = porCandidato(turno.vencedor);

  return (
    <div className="ag-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
      <StatTile
        label="Eleitorado"
        value={fmtInt(totais.eleitorado)}
        note={`${bairros.length} bairros`}
      />
      <StatTile
        label="Comparecimento"
        value={fmtInt(turno.comparecimento)}
        note={`abstencao de ${fmtPct(turno.abstencaoPct)}`}
      />
      <StatTile
        label="Votos validos"
        value={fmtInt(turno.validos)}
        note={`brancos e nulos: ${fmtInt(turno.brancos + turno.nulos)}`}
      />
      <StatTile
        label={vista === "t1" ? "Mais votado no 1o turno" : "Vencedor no municipio"}
        value={vencedor.nome}
        note={`${fmtPct(Math.max(turno.pctA, turno.pctB))} dos validos · ${data}`}
        tone={tomDe(turno.vencedor)}
      />
    </div>
  );
}
