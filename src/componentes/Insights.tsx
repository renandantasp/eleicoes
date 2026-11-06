import { useEffect, useMemo, useRef, useState } from "react";

import { fmtInt, fmtPct, fmtSinal, fmtSinalInt, porNumero } from "../dados/modelo";
import { carregarMunicipios, type DadosNacionais, type Municipio } from "../dados/municipios";
import { Callout, Segmented, StatTile } from "./grade";

type Modo = "percentual" | "absoluto";
type Ordem = "desc" | "asc";

const PISOS = [0, 500, 1_000, 5_000, 20_000];

/** Altura fixa de cada linha, em px. Tem de bater com --ag-row-h no CSS. */
const ALTURA_LINHA = 34;
const FOLGA = 12;

const NOME_UF: Record<string, string> = { ZZ: "Exterior" };
const rotuloUf = (uf: string) => NOME_UF[uf] ?? uf;

interface Coluna {
  rotulo: string;
  largura: string;
  num?: boolean;
  conteudo: (m: Municipio) => string;
  classe?: (m: Municipio) => string;
}

/**
 * Lista completa e rolavel de municipios, com Araraquara destacada.
 *
 * Mostra TODOS os municipios do recorte; a ordem se inverte pelo botao, de
 * forma que os dois extremos ficam a um clique um do outro.
 *
 * E virtualizada: so as linhas visiveis vao para o DOM, com dois espacadores
 * sustentando a altura do resto. A barra continua percorrendo a lista inteira.
 */
function ListaMunicipios({
  municipios,
  colunas,
  cdDestaque,
}: {
  municipios: Municipio[];
  colunas: Coluna[];
  cdDestaque: string | null;
}) {
  const refCaixa = useRef<HTMLDivElement | null>(null);
  const refQuadro = useRef<number | undefined>(undefined);
  const [scrollTop, setScrollTop] = useState(0);
  const [altura, setAltura] = useState(440);

  useEffect(() => {
    const el = refCaixa.current;
    if (!el) return;
    setAltura(el.clientHeight);
    const obs = new ResizeObserver(() => setAltura(el.clientHeight));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    refCaixa.current?.scrollTo({ top: 0 });
    setScrollTop(0);
  }, [municipios]);

  useEffect(() => () => cancelAnimationFrame(refQuadro.current ?? 0), []);

  function aoRolar(e: React.UIEvent<HTMLDivElement>) {
    const topo = e.currentTarget.scrollTop;
    cancelAnimationFrame(refQuadro.current ?? 0);
    refQuadro.current = requestAnimationFrame(() => setScrollTop(topo));
  }

  const total = municipios.length;
  const inicio = Math.max(0, Math.floor(scrollTop / ALTURA_LINHA) - FOLGA);
  const fim = Math.min(total, Math.ceil((scrollTop + altura) / ALTURA_LINHA) + FOLGA);
  const visiveis = municipios.slice(inicio, fim);

  const posicao = cdDestaque ? municipios.findIndex((m) => m.cd === cdDestaque) : -1;
  const template = `44px minmax(0,1fr) 68px ${colunas.map((c) => c.largura).join(" ")}`;

  function irAoDestaque() {
    const caixa = refCaixa.current;
    if (!caixa || posicao < 0) return;
    const alvo = posicao * ALTURA_LINHA - caixa.clientHeight / 2 + ALTURA_LINHA / 2;
    caixa.scrollTo({ top: Math.max(0, alvo), behavior: "smooth" });
  }

  return (
    <div>
      <div className="lista-barra">
        <span className="lista-barra__total">{fmtInt(total)} municipios</span>
        {posicao >= 0 ? (
          <button type="button" className="btn-destaque" onClick={irAoDestaque}>
            <i className="marca-destaque" />
            Araraquara e a {fmtInt(posicao + 1)}a &rarr; ir ate ela
          </button>
        ) : (
          <span className="lista-barra__total">Araraquara fora deste recorte</span>
        )}
      </div>

      <div className="ag-table" role="table">
        <div className="ag-table__head" style={{ gridTemplateColumns: template }} role="row">
          <span role="columnheader" className="num">#</span>
          <span role="columnheader">Municipio</span>
          <span role="columnheader">UF</span>
          {colunas.map((c) => (
            <span key={c.rotulo} role="columnheader" className={c.num ? "num" : ""}>
              {c.rotulo}
            </span>
          ))}
        </div>

        <div className="lista-rolavel" ref={refCaixa} onScroll={aoRolar} role="rowgroup">
          {inicio > 0 && <div className="espacador" style={{ height: inicio * ALTURA_LINHA }} />}

          {visiveis.map((m, i) => {
            const ehDestaque = m.cd === cdDestaque;
            return (
              <div
                key={m.cd}
                role="row"
                className={`ag-table__row${ehDestaque ? " linha-destaque" : ""}`}
                style={{ gridTemplateColumns: template, cursor: "default" }}
              >
                <span role="cell" className="num">{inicio + i + 1}</span>
                <span role="cell" className="cel-bairro">
                  {ehDestaque && <i className="marca-destaque" />}
                  <span className="cel-bairro__nome">{m.nome}</span>
                </span>
                <span role="cell">{rotuloUf(m.uf)}</span>
                {colunas.map((c) => (
                  <span
                    key={c.rotulo}
                    role="cell"
                    className={`${c.num ? "num" : ""} ${c.classe?.(m) ?? ""}`}
                  >
                    {c.conteudo(m)}
                  </span>
                ))}
              </div>
            );
          })}

          {fim < total && <div className="espacador" style={{ height: (total - fim) * ALTURA_LINHA }} />}

          {total === 0 && <div className="vazio-lista">Nenhum municipio atende aos filtros atuais.</div>}
        </div>
      </div>
    </div>
  );
}

function BlocoCandidato({
  dados,
  lado,
  filtrados,
}: {
  dados: DadosNacionais;
  lado: "A" | "B";
  filtrados: Municipio[];
}) {
  const [modo, setModo] = useState<Modo>("percentual");
  const [ordem, setOrdem] = useState<Ordem>("desc");

  const info = dados.base.candidatos[lado];
  const cand = porNumero(info.numero, info.nomeTse);

  const votos1 = (m: Municipio) => (lado === "A" ? m.a1 : m.b1);
  const votos2 = (m: Municipio) => (lado === "A" ? m.a2 : m.b2);
  const delta = (m: Municipio) => (lado === "A" ? m.deltaA : m.deltaB);
  const cresc = (m: Municipio) => (lado === "A" ? m.crescA : m.crescB);
  const chave = modo === "percentual" ? cresc : delta;

  const ordenados = useMemo(() => {
    const lista = filtrados.filter((m) => Number.isFinite(chave(m)));
    lista.sort((a, b) => (ordem === "desc" ? chave(b) - chave(a) : chave(a) - chave(b)));
    return lista;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrados, modo, ordem, lado]);

  const cresceram = filtrados.filter((m) => delta(m) > 0).length;

  const colunas: Coluna[] = [
    { rotulo: "1o turno", largura: "92px", num: true, conteudo: (m) => fmtInt(votos1(m)) },
    { rotulo: "2o turno", largura: "92px", num: true, conteudo: (m) => fmtInt(votos2(m)) },
    {
      rotulo: "Dif.",
      largura: "88px",
      num: true,
      conteudo: (m) => fmtSinalInt(delta(m)),
      classe: (m) => (delta(m) >= 0 ? "pos" : "neg"),
    },
    {
      rotulo: "Cresc.",
      largura: "80px",
      num: true,
      conteudo: (m) => (Number.isFinite(cresc(m)) ? `${fmtSinal(cresc(m))}%` : "–"),
      classe: (m) => (cresc(m) >= 0 ? "pos" : "neg"),
    },
  ];

  return (
    <section className="bloco-mun">
      <header className="bloco-mun__cab">
        <div>
          <h4>
            <i
              className="bolinha"
              style={{ background: `var(--ag-${lado === "A" ? "lula" : "flavio"})` }}
            />
            {cand.nome} &middot; {cand.numero}
          </h4>
          <p className="bloco-mun__sub">
            {fmtInt(cresceram)} dos {fmtInt(filtrados.length)} municipios filtrados ganharam votos (
            {fmtPct((cresceram / Math.max(1, filtrados.length)) * 100)}). A lista traz todos eles;
            inverta a ordem para ver o outro extremo.
          </p>
        </div>
        <div className="bloco-mun__controles">
          <Segmented
            label="Medida"
            value={modo}
            onChange={setModo}
            options={[
              { id: "percentual", label: "Percentual" },
              { id: "absoluto", label: "Absoluto" },
            ]}
          />
          <Segmented
            label="Ordem"
            value={ordem}
            onChange={setOrdem}
            options={[
              { id: "desc", label: "Maiores" },
              { id: "asc", label: "Menores" },
            ]}
          />
        </div>
      </header>

      <ListaMunicipios municipios={ordenados} colunas={colunas} cdDestaque={dados.cdDestaque} />
    </section>
  );
}

function BlocoSwing({ dados, filtrados }: { dados: DadosNacionais; filtrados: Municipio[] }) {
  const [ordem, setOrdem] = useState<Ordem>("desc");

  const A = porNumero(dados.base.candidatos.A.numero, dados.base.candidatos.A.nomeTse);
  const B = porNumero(dados.base.candidatos.B.numero, dados.base.candidatos.B.nomeTse);

  const ordenados = useMemo(() => {
    const lista = [...filtrados];
    lista.sort((a, b) => (ordem === "desc" ? b.swing - a.swing : a.swing - b.swing));
    return lista;
  }, [filtrados, ordem]);

  const andaramA = filtrados.filter((m) => m.swing > 0).length;

  const colunas: Coluna[] = [
    { rotulo: "1o turno", largura: "92px", num: true, conteudo: (m) => fmtPct(m.p1) },
    { rotulo: "2o turno", largura: "92px", num: true, conteudo: (m) => fmtPct(m.p2) },
    {
      rotulo: "Desloc.",
      largura: "88px",
      num: true,
      conteudo: (m) => `${fmtSinal(m.swing)} pp`,
      classe: (m) => (m.swing >= 0 ? "pos" : "neg"),
    },
    { rotulo: "Validos 2o", largura: "80px", num: true, conteudo: (m) => fmtInt(m.v2) },
  ];

  return (
    <section className="bloco-mun">
      <header className="bloco-mun__cab">
        <div>
          <h4>Deslocamento real, sem o efeito das chapas eliminadas</h4>
          <p className="bloco-mun__sub">
            Share de {A.nome} sobre {A.nome} + {B.nome}, comparado entre os turnos. Positivo
            significa que o municipio andou para {A.nome}; negativo, para {B.nome}.{" "}
            {fmtInt(andaramA)} dos {fmtInt(filtrados.length)} municipios filtrados andaram para{" "}
            {A.nome}.
          </p>
        </div>
        <div className="bloco-mun__controles">
          <Segmented
            label="Ordem"
            value={ordem}
            onChange={setOrdem}
            options={[
              { id: "desc", label: `Para ${A.nome}` },
              { id: "asc", label: `Para ${B.nome}` },
            ]}
          />
        </div>
      </header>

      <ListaMunicipios municipios={ordenados} colunas={colunas} cdDestaque={dados.cdDestaque} />
    </section>
  );
}

export function Insights() {
  const [dados, setDados] = useState<DadosNacionais | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [piso, setPiso] = useState(1_000);
  const [uf, setUf] = useState("todas");
  const [incluirExterior, setIncluirExterior] = useState(false);

  useEffect(() => {
    let vivo = true;
    carregarMunicipios()
      .then((d) => vivo && setDados(d))
      .catch((e) => vivo && setErro(String(e.message ?? e)));
    return () => {
      vivo = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    if (!dados) return [];
    return dados.municipios.filter((m) => {
      if (!incluirExterior && m.uf === "ZZ") return false;
      if (uf !== "todas" && m.uf !== uf) return false;
      return m.v1 >= piso;
    });
  }, [dados, piso, uf, incluirExterior]);

  if (erro) {
    return (
      <div className="insights">
        <Callout tone="flip">
          {erro} O arquivo <code>public/municipios-brasil.json</code> e gerado por{" "}
          <code>scripts/tse-07-municipios.mjs</code>.
        </Callout>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="insights">
        <p className="carregando">Carregando os municipios do TSE...</p>
      </div>
    );
  }

  const A = porNumero(dados.base.candidatos.A.numero, dados.base.candidatos.A.nomeTse);
  const B = porNumero(dados.base.candidatos.B.numero, dados.base.candidatos.B.nomeTse);
  const t = dados.base.totais;

  const pctA1 = (t.a1 / t.v1) * 100;
  const pctB1 = (t.b1 / t.v1) * 100;
  const pctA2 = (t.a2 / t.v2) * 100;
  const pctB2 = (t.b2 / t.v2) * 100;

  const araraquara = dados.municipios.find((m) => m.cd === dados.cdDestaque);
  const foraDoRecorte = araraquara != null && !filtrados.some((m) => m.cd === araraquara.cd);

  const cresceuA = (dados.municipios.filter((m) => m.deltaA > 0).length / dados.municipios.length) * 100;
  const cresceuB = (dados.municipios.filter((m) => m.deltaB > 0).length / dados.municipios.length) * 100;
  const ambos = dados.municipios.filter((m) => m.deltaA > 0 && m.deltaB > 0).length;

  return (
    <div className="insights">
      <div className="ag-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <StatTile
          label="1o turno, Brasil"
          value={pctA1 >= pctB1 ? A.nome : B.nome}
          note={`${fmtPct(Math.max(pctA1, pctB1))} x ${fmtPct(Math.min(pctA1, pctB1))}`}
          tone={pctA1 >= pctB1 ? "lula" : "flavio"}
        />
        <StatTile
          label="2o turno, Brasil"
          value={pctA2 >= pctB2 ? A.nome : B.nome}
          note={`${fmtPct(Math.max(pctA2, pctB2))} x ${fmtPct(Math.min(pctA2, pctB2))}`}
          tone={pctA2 >= pctB2 ? "lula" : "flavio"}
        />
        <StatTile
          label="Deslocamento nacional"
          value={`${fmtSinal(dados.swingNacional)} pp`}
          note={`no voto a dois, para ${A.nome}`}
          tone={dados.swingNacional >= 0 ? "lula" : "flavio"}
        />
        {araraquara && (
          <StatTile
            className="cartao-destaque"
            label={
              <>
                <i className="marca-destaque" /> Araraquara
              </>
            }
            value={`${fmtSinal(araraquara.swing)} pp`}
            note={`${fmtPct(araraquara.p1)} para ${fmtPct(araraquara.p2)} no voto a dois`}
          />
        )}
      </div>

      <Callout>
        <strong>Leia com cuidado:</strong> do 1o para o 2o turno o numero de chapas caiu de treze
        para duas, entao os dois finalistas herdam votos e crescem quase em toda parte. No Brasil
        inteiro, {A.nome} ganhou votos em {fmtPct(cresceuA)} dos municipios e {B.nome}, em{" "}
        {fmtPct(cresceuB)} &mdash; e em {fmtInt(ambos)} deles os dois cresceram. Os rankings abaixo
        sao exatamente o que foi pedido, mas medir &ldquo;crescimento&rdquo; assim diz mais sobre
        quantos votos as chapas eliminadas tinham ali do que sobre deslocamento politico. A ultima
        secao traz a medida sem esse efeito.
      </Callout>

      <div className="filtros">
        <label>
          <span>Minimo de votos validos no 1o turno</span>
          <select value={piso} onChange={(e) => setPiso(Number(e.target.value))}>
            {PISOS.map((p) => (
              <option key={p} value={p}>
                {p === 0 ? "sem minimo" : fmtInt(p)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>UF</span>
          <select value={uf} onChange={(e) => setUf(e.target.value)}>
            <option value="todas">todas</option>
            {dados.ufs
              .filter((u) => u !== "ZZ")
              .map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
          </select>
        </label>
        <label className="filtro-check">
          <input
            type="checkbox"
            checked={incluirExterior}
            onChange={(e) => setIncluirExterior(e.target.checked)}
          />
          <span>Incluir o exterior (144 localidades, nao sao municipios)</span>
        </label>
        {foraDoRecorte && (
          <div style={{ flex: "1 1 100%" }}>
            <Callout tone="destaque">
              Com os filtros atuais, Araraquara fica de fora das listas.
            </Callout>
          </div>
        )}
        <p className="filtros__nota">
          O minimo existe porque percentual em cidade pequena engana: o menor municipio do pais tem 5
          votos validos, e 62 tem menos de 200. Sem piso, o ranking percentual vira uma lista de
          vilarejos onde meia duzia de votos vale centenas por cento.
        </p>
      </div>

      <BlocoCandidato dados={dados} lado="B" filtrados={filtrados} />
      <BlocoCandidato dados={dados} lado="A" filtrados={filtrados} />
      <BlocoSwing dados={dados} filtrados={filtrados} />

      <p className="sobre__rodape">
        Fonte: {dados.base.fonte.orgao} &middot; {dados.base.fonte.conjunto} &middot;{" "}
        {dados.base.pleito}, {dados.base.datas.turno1} e {dados.base.datas.turno2} &middot; extraido
        em {dados.base.extraidoEm}
      </p>
    </div>
  );
}
