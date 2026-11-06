import {
  candA,
  candB,
  fmtInt,
  fmtPct,
  fmtSinal,
  fmtSinalInt,
  locais,
  ordemPrimeiroTurno,
  porCandidato,
  totais,
  type Bairro,
  type MetricasTurno,
  type Unidade,
} from "../dados/modelo";
import type { Vista } from "../metricas";
import { Callout, CandidateBars, MiniStat, VoteSplit, WinnerBadge } from "./grade";

/** "lula" | "flavio" para as classes de cor do design system. */
const tomDe = (id: string) => (id === candA.id ? "lula" : "flavio") as "lula" | "flavio";

function barrasDoTurno(turno: MetricasTurno, ids: string[]) {
  return ids
    .filter((id) => (turno.votos[id] ?? 0) > 0)
    .map((id) => {
      const c = porCandidato(id);
      return {
        key: id,
        label: c.nome,
        number: c.numero,
        tseName: c.nomeTse,
        share: turno.validos > 0 ? (turno.votos[id] ?? 0) / turno.validos : 0,
        color: `var(--ag-${id === candA.id ? "lula" : id === candB.id ? "flavio" : "outros"})`,
      };
    });
}

function BlocoTurno({ titulo, turno, ids }: { titulo: string; turno: MetricasTurno; ids: string[] }) {
  return (
    <section className="ag-panel__section">
      <span className="ag-label">{titulo}</span>
      <CandidateBars items={barrasDoTurno(turno, ids)} />
      <div className="ag-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 4 }}>
        <MiniStat label="Comparecimento" value={fmtInt(turno.comparecimento)} />
        <MiniStat label="Abstencao" value={fmtPct(turno.abstencaoPct)} />
        <MiniStat label="Validos" value={fmtInt(turno.validos)} />
        <MiniStat label="Brancos + nulos" value={fmtInt(turno.brancos + turno.nulos)} />
      </div>
    </section>
  );
}

/** Voto a dois do bairro, ou da cidade quando nao ha selecao. */
export function VotoADois({ unidade, rotulo }: { unidade: Unidade | null; rotulo: string }) {
  const u = unidade;
  const p1 = u ? u.t1.pctA2p : totais.t1.pctA2p;
  const p2 = u ? u.t2.pctA2p : totais.t2.pctA2p;
  const desloc = p2 - p1;

  return (
    <VoteSplit
      nomeA={candA.nome}
      nomeB={candB.nome}
      rows={[
        { label: `${rotulo} · 1o turno`, share: p1 / 100 },
        { label: `${rotulo} · 2o turno`, share: p2 / 100 },
      ]}
      shiftLabel={`${fmtSinal(desloc)} pp para ${desloc >= 0 ? candA.nome : candB.nome} entre os turnos`}
    />
  );
}

function LinhaComparacao({ u, lado }: { u: Unidade; lado: "A" | "B" }) {
  const cand = lado === "A" ? candA : candB;
  const pct1 = lado === "A" ? u.t1.pctA : u.t1.pctB;
  const pct2 = lado === "A" ? u.t2.pctA : u.t2.pctB;
  const v1 = lado === "A" ? u.t1.votosA : u.t1.votosB;
  const v2 = lado === "A" ? u.t2.votosA : u.t2.votosB;
  const d = lado === "A" ? u.deltaVotosA : u.deltaVotosB;
  const cresc = lado === "A" ? u.crescA : u.crescB;

  return (
    <tr>
      <th scope="row" style={{ textAlign: "left", fontWeight: 500 }}>
        <i
          className="bolinha"
          style={{ background: `var(--ag-${lado === "A" ? "lula" : "flavio"})`, marginRight: 6 }}
        />
        {cand.nome}
      </th>
      <td className="num">{fmtPct(pct1)}</td>
      <td className="num">{fmtPct(pct2)}</td>
      <td className="num">{fmtInt(v1)}</td>
      <td className="num">{fmtInt(v2)}</td>
      <td className={`num ${d >= 0 ? "pos" : "neg"}`}>{fmtSinalInt(d)}</td>
      <td className={`num ${cresc >= 0 ? "pos" : "neg"}`}>{fmtSinal(cresc)}%</td>
    </tr>
  );
}

export function PainelBairro({
  bairro,
  vista,
  localDestacado,
  onSelecionarLocal,
}: {
  bairro: Bairro;
  vista: Vista;
  localDestacado: string | null;
  onSelecionarLocal: (id: string) => void;
}) {
  const vencedor2 = porCandidato(bairro.t2.vencedor);
  const vencedor1 = porCandidato(bairro.t1.vencedor);
  const peso = (bairro.eleitorado / totais.eleitorado) * 100;
  const doBairro = locais
    .filter((l) => l.bairroId === bairro.id)
    .sort((a, b) => b.eleitorado - a.eleitorado);

  return (
    <>
      <div className="painel-titulo">
        <span className="ag-label">Bairro selecionado</span>
        <h3>{bairro.nome}</h3>
        <p className="painel-meta">
          {fmtInt(bairro.eleitorado)} eleitores &middot; {fmtPct(peso)} da cidade &middot;{" "}
          {bairro.qtdSecoes} secoes &middot; {doBairro.length}{" "}
          {doBairro.length === 1 ? "local" : "locais"}
        </p>
      </div>

      <WinnerBadge
        nome={vencedor2.nome}
        tone={tomDe(bairro.t2.vencedor)}
        margin={`${fmtSinal(Math.abs(bairro.t2.vantagem))} pp de vantagem`}
      />

      {bairro.virou && (
        <Callout tone="flip">
          Este bairro mudou de lado: {vencedor1.nome} liderava no 1o turno e {vencedor2.nome} venceu
          no 2o.
        </Callout>
      )}

      <VotoADois unidade={bairro} rotulo={bairro.nome} />

      {vista === "dif" ? (
        <section className="ag-panel__section">
          <span className="ag-label">Do 1o para o 2o turno</span>
          <div style={{ overflowX: "auto" }}>
            <table className="ag-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "var(--ag-text-3)", fontSize: "var(--ag-fs-mono)" }}>
                  <th style={{ textAlign: "left" }}>Chapa</th>
                  <th className="num">% 1o</th>
                  <th className="num">% 2o</th>
                  <th className="num">Votos 1o</th>
                  <th className="num">Votos 2o</th>
                  <th className="num">Dif.</th>
                  <th className="num">Cresc.</th>
                </tr>
              </thead>
              <tbody>
                <LinhaComparacao u={bairro} lado="A" />
                <LinhaComparacao u={bairro} lado="B" />
              </tbody>
            </table>
          </div>

          <Callout>
            As colunas % sao share sobre o total de validos, entao sobem para os dois finalistas so
            porque as outras onze chapas sairam. O voto a dois acima isola o deslocamento real.
          </Callout>

          <div className="ag-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <MiniStat label="Deslocamento" value={`${fmtSinal(bairro.swing2p)} pp`} />
            <MiniStat label="Vs. media da cidade" value={`${fmtSinal(bairro.swingRelativo)} pp`} />
            <MiniStat label="Comparecimento" value={fmtSinalInt(bairro.deltaComparecimento)} />
            <MiniStat
              label="Abstencao"
              value={`${fmtSinal(bairro.t2.abstencaoPct - bairro.t1.abstencaoPct)} pp`}
            />
          </div>
        </section>
      ) : vista === "t1" ? (
        <BlocoTurno titulo="1o turno" turno={bairro.t1} ids={ordemPrimeiroTurno} />
      ) : (
        <BlocoTurno titulo="2o turno" turno={bairro.t2} ids={[candA.id, candB.id]} />
      )}

      <section className="ag-panel__section">
        <span className="ag-label">
          {doBairro.length === 1 ? "Local de votacao" : `Locais de votacao · ${doBairro.length}`}
        </span>
        <ul className="painel-locais">
          {doBairro.map((l) => {
            const t = vista === "t2" ? l.t2 : l.t1;
            const vencedor = porCandidato(t.vencedor);
            return (
              <li key={l.id} data-ativo={localDestacado === l.id}>
                <button type="button" onClick={() => onSelecionarLocal(l.id)}>
                  <span className="local-nome">{l.nome}</span>
                  <span className="local-end">{l.endereco}</span>
                  <span className="local-linha">
                    <span>{fmtInt(l.eleitorado)} eleitores</span>
                    <span>{l.qtdSecoes} secoes</span>
                    {l.latitude == null && <span>sem coordenada</span>}
                    <i
                      className="bolinha"
                      style={{ background: `var(--ag-${tomDe(t.vencedor)})` }}
                      title={vencedor.nomeTse}
                    />
                    <span>{fmtPct(Math.max(t.pctA, t.pctB))}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
