import { useMemo, useState } from "react";

import { Mapa } from "./componentes/Mapa";
import { PainelBairro, VotoADois } from "./componentes/PainelBairro";
import { TabelaBairros } from "./componentes/TabelaBairros";
import { GraficoChapas, Totais } from "./componentes/Totais";
import { SobreDados } from "./componentes/SobreDados";
import { Insights } from "./componentes/Insights";
import { Entenda } from "./componentes/Entenda";
import { Legend, MetricList, ProvenanceBar, Segmented, Tabs } from "./componentes/grade";
import { linhasDaLegenda } from "./legenda";
import { METRICAS, TITULOS, type Vista } from "./metricas";
import {
  bairroPorId,
  bairros,
  candA,
  candB,
  fmtInt,
  fmtPct,
  locais,
  meta,
  porCandidato,
  totais,
  type Local,
} from "./dados/modelo";
import { aplicarTema, temaAtual, type Tema } from "./tema";

type Aba = Vista | "insights" | "entenda";
type SubAba = "mapa" | "graficos";

const ABAS: { id: Aba; label: string; sub: string }[] = [
  { id: "t1", label: "1o turno", sub: "04/10/2026" },
  { id: "t2", label: "2o turno", sub: "25/10/2026" },
  { id: "dif", label: "Diferenca", sub: "entre os turnos" },
  { id: "insights", label: "Brasil", sub: "5.715 municipios" },
  { id: "entenda", label: "Entenda", sub: "termos e medidas" },
];

const SUB_ABAS: { id: SubAba; label: string }[] = [
  { id: "mapa", label: "Mapa e bairros" },
  { id: "graficos", label: "Grafico geral e por bairro" },
];

const NOTA_SUB_ABA: Record<SubAba, string> = {
  mapa: "Os locais de votacao no mapa, com o painel de anotacao do bairro selecionado.",
  graficos: "As chapas na cidade inteira, nos dois turnos, e depois uma barra por bairro.",
};

/** Abas que nao sao uma visualizacao do municipio e por isso tem titulo proprio. */
const TITULOS_EXTRA: Record<"insights" | "entenda", { titulo: string; subtitulo: string }> = {
  insights: {
    titulo: "Insights nacionais",
    subtitulo: "Onde cada candidato cresceu entre os turnos, nos 5.715 municipios do pais",
  },
  entenda: {
    titulo: "Entenda as medidas",
    subtitulo: "O que cada termo da pagina significa, com a conta que o produz",
  },
};

const ABA_SEM_MAPA = (a: Aba): a is "insights" | "entenda" => a === "insights" || a === "entenda";

export default function App() {
  const [aba, setAba] = useState<Aba>("t1");
  const [subAba, setSubAba] = useState<SubAba>("mapa");
  const [metricaId, setMetricaId] = useState<string>(METRICAS.t1[0].id);
  const [bairroSel, setBairroSel] = useState<string | null>(null);
  const [localDestacado, setLocalDestacado] = useState<string | null>(null);
  const [tema, setTema] = useState<Tema>(() => temaAtual());

  const vista: Vista = ABA_SEM_MAPA(aba) ? "t1" : aba;
  const metricas = METRICAS[vista];
  const metrica = useMemo(
    () => metricas.find((m) => m.id === metricaId) ?? metricas[0],
    [metricas, metricaId],
  );
  const bairro = bairroSel ? (bairroPorId.get(bairroSel) ?? null) : null;
  const linhasLegenda = useMemo(() => linhasDaLegenda(metrica), [metrica]);

  function trocaAba(id: string) {
    const nova = id as Aba;
    setAba(nova);
    if (!ABA_SEM_MAPA(nova)) setMetricaId(METRICAS[nova][0].id);
  }

  function trocaTema(t: Tema) {
    aplicarTema(t);
    setTema(t);
  }

  function selecionarLocal(l: Local) {
    setBairroSel(l.bairroId);
    setLocalDestacado(l.id);
  }

  function limpar() {
    setBairroSel(null);
    setLocalDestacado(null);
  }

  function irParaRessalvas() {
    document.getElementById("sobre-os-dados")?.scrollIntoView({ behavior: "smooth" });
  }

  const vencedor2 = porCandidato(totais.t2.vencedor);
  const lider1 = porCandidato(totais.t1.vencedor);

  return (
    <div className="ag-root">
      <ProvenanceBar
        dates={[`1o turno ${meta.datas.turno1}`, `2o turno ${meta.datas.turno2}`]}
        onIrParaRessalvas={irParaRessalvas}
      >
        <span className="tema-switch">
          <Segmented
            label="Tema"
            value={tema}
            onChange={trocaTema}
            options={[
              { id: "light", label: "Claro" },
              { id: "dark", label: "Escuro" },
            ]}
          />
        </span>
      </ProvenanceBar>

      <div className="pagina">
        <header className="cabecalho faixa-pagina">
          <span className="ag-label">{meta.pleito}</span>
          <h1>Araraquara em dois turnos</h1>
          <p className="cabecalho__lede">
            {meta.municipioExibicao} &middot; {fmtInt(totais.eleitorado)} eleitores em{" "}
            {bairros.length} bairros e {locais.length} locais de votacao. No 2o turno a cidade ficou
            com{" "}
            <strong className={totais.t2.vencedor === candA.id ? "tx-lula" : "tx-flavio"}>
              {vencedor2.nome}
            </strong>
            , com {fmtPct(Math.max(totais.t2.pctA, totais.t2.pctB))} dos votos validos &mdash;
            depois de{" "}
            <strong className={totais.t1.vencedor === candA.id ? "tx-lula" : "tx-flavio"}>
              {lider1.nome}
            </strong>{" "}
            ter liderado o 1o turno com {fmtPct(Math.max(totais.t1.pctA, totais.t1.pctB))}.
          </p>
        </header>

        <div className="abas-barra faixa-pagina">
          <Tabs items={ABAS} value={aba} onChange={trocaAba} />
        </div>

        <main className="faixa-pagina">
          <section className="secao-titulo">
            <h2>{ABA_SEM_MAPA(aba) ? TITULOS_EXTRA[aba].titulo : TITULOS[vista].titulo}</h2>
            <p>{ABA_SEM_MAPA(aba) ? TITULOS_EXTRA[aba].subtitulo : TITULOS[vista].subtitulo}</p>
          </section>

          {aba === "insights" ? (
            <Insights />
          ) : aba === "entenda" ? (
            <Entenda />
          ) : (
            <>
              <div className="bloco bloco--topo">
                <Totais vista={vista} />
              </div>

              <div className="sub-abas">
                <Segmented
                  label="Visualizacao do turno"
                  value={subAba}
                  onChange={setSubAba}
                  options={SUB_ABAS}
                />
                <p className="sub-abas__nota">{NOTA_SUB_ABA[subAba]}</p>
              </div>

              {subAba === "mapa" ? (
                <div className="ag-shell">
                  <div className="coluna-trilho">
                    <span className="ag-label">Cor dos circulos</span>
                    <MetricList
                      items={metricas.map((m) => ({ id: m.id, label: m.rotulo, unit: m.unidade }))}
                      value={metrica.id}
                      onChange={setMetricaId}
                    />
                    <p className="trilho-nota">
                      Cada circulo e um dos {locais.length} locais de votacao, na coordenada que o TSE
                      publica. Area proporcional ao eleitorado.
                    </p>
                  </div>

                  <div className="coluna-mapa">
                    <Mapa
                      metrica={metrica}
                      bairroSelecionado={bairroSel}
                      localDestacado={localDestacado}
                      onSelecionarLocal={selecionarLocal}
                      onLimpar={limpar}
                    />
                    <div className="legenda-caixa">
                      <Legend
                        title={metrica.rotulo}
                        unit={metrica.unidade}
                        rows={linhasLegenda}
                        footnote={
                          <>
                            numero no quadrado = bairros na faixa &middot; fonte: TSE,{" "}
                            {metrica.fonte}
                          </>
                        }
                      />
                    </div>
                  </div>

                  <aside className="ag-panel">
                    {bairro ? (
                      <PainelBairro
                        bairro={bairro}
                        vista={vista}
                        localDestacado={localDestacado}
                        onSelecionarLocal={setLocalDestacado}
                      />
                    ) : (
                      <div className="painel-vazio">
                        <div className="painel-titulo">
                          <span className="ag-label">Nenhum bairro selecionado</span>
                          <h3>Araraquara inteira</h3>
                        </div>
                        <VotoADois unidade={null} rotulo="Cidade" />
                        <p className="painel-meta">
                          Clique num circulo para abrir o bairro daquele local.
                        </p>
                        <ul className="painel-dicas">
                          <li>Passe o mouse para ver o valor da metrica naquele local.</li>
                          <li>
                            O mapa abre no nucleo urbano: os locais mais proximos do centro que somam
                            95% do eleitorado.
                          </li>
                          <li>As linhas da tabela abaixo tambem abrem um bairro.</li>
                        </ul>
                        <p className="painel-meta">
                          O {bairros[0].nome} concentra o maior eleitorado:{" "}
                          {fmtInt(bairros[0].eleitorado)} eleitores,{" "}
                          {fmtPct((bairros[0].eleitorado / totais.eleitorado) * 100)} do total.
                        </p>
                      </div>
                    )}
                  </aside>
                </div>
              ) : (
                <>
                  <GraficoChapas turno="t1" topo />
                  <GraficoChapas turno="t2" />

                  <div className="bloco">
                    <div className="bloco__cab">
                      <h3>Cada bairro, na metrica escolhida</h3>
                      <p className="bloco__nota">
                        Acima, a cidade inteira; aqui, a mesma apuracao aberta nos {bairros.length}{" "}
                        bairros.
                      </p>
                    </div>

                    <div className="graficos-controles">
                      <div className="graficos-controles__metricas">
                        <span className="ag-label">Metrica da barra</span>
                        <div className="metricas-linha">
                          <MetricList
                            items={metricas.map((m) => ({ id: m.id, label: m.rotulo, unit: m.unidade }))}
                            value={metrica.id}
                            onChange={setMetricaId}
                            label="Metrica da barra"
                          />
                        </div>
                      </div>
                      <div className="graficos-controles__legenda">
                        <Legend
                          title={metrica.rotulo}
                          unit={metrica.unidade}
                          rows={linhasLegenda}
                          footnote={
                            <>
                              numero no quadrado = bairros na faixa &middot; fonte: TSE, {metrica.fonte}
                            </>
                          }
                        />
                      </div>
                    </div>

                    <TabelaBairros
                      vista={vista}
                      metrica={metrica}
                      selecionado={bairroSel}
                      onSelecionar={setBairroSel}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </main>

        <div className="faixa-pagina">
          <SobreDados />
        </div>

        <footer className="rodape faixa-pagina">
          Dados: Tribunal Superior Eleitoral (dados abertos) e IBGE. {candA.nome} ({candA.numero}) e{" "}
          {candB.nome} ({candB.numero}) disputaram o 2o turno em {meta.datas.turno2}.
        </footer>
      </div>
    </div>
  );
}
