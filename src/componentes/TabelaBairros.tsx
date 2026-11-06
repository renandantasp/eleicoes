import { useMemo, useState } from "react";

import {
  bairros,
  candA,
  candB,
  fmtInt,
  fmtPct,
  locais,
  porCandidato,
  type Bairro,
} from "../dados/modelo";
import { corCss } from "../escalas";
import type { Metrica, Vista } from "../metricas";
import { InlineBar } from "./grade";

/** Quantos locais de votacao cada bairro tem. */
const LOCAIS_POR_BAIRRO = new Map<string, number>();
for (const l of locais) {
  if (l.bairroId) LOCAIS_POR_BAIRRO.set(l.bairroId, (LOCAIS_POR_BAIRRO.get(l.bairroId) ?? 0) + 1);
}

interface Coluna {
  id: string;
  rotulo: string;
  titulo?: string;
  largura: string;
  num: boolean;
  ordenar: (b: Bairro) => number | string;
  conteudo: (b: Bairro) => React.ReactNode;
  classe?: (b: Bairro) => string;
}

export function TabelaBairros({
  vista,
  metrica,
  selecionado,
  onSelecionar,
}: {
  vista: Vista;
  metrica: Metrica;
  selecionado: string | null;
  onSelecionar: (id: string) => void;
}) {
  const divergente = metrica.legenda.tipo === "divergente";

  /** Maior valor absoluto, para dimensionar a barra inline. */
  const maxBarra = useMemo(() => {
    const vs = bairros.map((b) => Math.abs(metrica.valor(b)));
    return Math.max(...vs, 1);
  }, [metrica]);

  const colunas: Coluna[] = useMemo(() => {
    const base: Coluna[] = [
      {
        id: "nome",
        rotulo: "Bairro",
        largura: "minmax(0,1fr)",
        num: false,
        ordenar: (b) => b.nome,
        conteudo: (b) => (
          <span className="cel-bairro">
            <span className="cel-bairro__nome">{b.nome}</span>
          </span>
        ),
      },
      {
        id: "locais",
        rotulo: "Locais",
        titulo: "Quantos locais de votacao formam o bairro",
        largura: "56px",
        num: true,
        ordenar: (b) => LOCAIS_POR_BAIRRO.get(b.id) ?? 0,
        conteudo: (b) => LOCAIS_POR_BAIRRO.get(b.id) ?? 0,
      },
      {
        id: "eleitorado",
        rotulo: "Eleitores",
        largura: "84px",
        num: true,
        ordenar: (b) => b.eleitorado,
        conteudo: (b) => fmtInt(b.eleitorado),
      },
      {
        id: "metrica",
        rotulo: metrica.rotulo,
        titulo: metrica.descricao,
        largura: "92px",
        num: true,
        ordenar: (b) => metrica.valor(b),
        conteudo: (b) => metrica.formato(metrica.valor(b)),
        classe: (b) => (divergente ? (metrica.valor(b) >= 0 ? "pos" : "neg") : ""),
      },
      {
        id: "barra",
        rotulo: "",
        largura: "124px",
        num: false,
        ordenar: (b) => metrica.valor(b),
        conteudo: (b) => (
          <InlineBar
            value={metrica.valor(b)}
            max={maxBarra}
            diverging={divergente}
            color={corCss(metrica.cor(metrica.valor(b)))}
          />
        ),
      },
    ];

    if (vista === "dif") {
      return [
        ...base,
        {
          id: "p1",
          rotulo: "A dois 1o",
          titulo: `Share de ${candA.nome} sobre ${candA.nome} + ${candB.nome} no 1o turno`,
          largura: "78px",
          num: true,
          ordenar: (b) => b.t1.pctA2p,
          conteudo: (b) => fmtPct(b.t1.pctA2p),
        },
        {
          id: "p2",
          rotulo: "A dois 2o",
          titulo: `Share de ${candA.nome} sobre ${candA.nome} + ${candB.nome} no 2o turno`,
          largura: "78px",
          num: true,
          ordenar: (b) => b.t2.pctA2p,
          conteudo: (b) => fmtPct(b.t2.pctA2p),
        },
        {
          id: "virou",
          rotulo: "Virou",
          titulo: "Mudou de lado entre os turnos",
          largura: "56px",
          num: true,
          ordenar: (b) => (b.virou ? 1 : 0),
          conteudo: (b) => (b.virou ? "↻" : "–"),
        },
      ];
    }

    const t = vista === "t1" ? (b: Bairro) => b.t1 : (b: Bairro) => b.t2;
    return [
      ...base,
      {
        id: "a",
        rotulo: `% ${candA.nome}`,
        largura: "76px",
        num: true,
        ordenar: (b) => t(b).pctA,
        conteudo: (b) => fmtPct(t(b).pctA),
      },
      {
        id: "b",
        rotulo: `% ${candB.nome}`,
        largura: "76px",
        num: true,
        ordenar: (b) => t(b).pctB,
        conteudo: (b) => fmtPct(t(b).pctB),
      },
      {
        id: "abst",
        rotulo: "Abstencao",
        largura: "84px",
        num: true,
        ordenar: (b) => t(b).abstencaoPct,
        conteudo: (b) => fmtPct(t(b).abstencaoPct),
      },
      {
        id: "vence",
        rotulo: "Vence",
        largura: "124px",
        num: false,
        ordenar: (b) => t(b).vencedor,
        conteudo: (b) => (
          <span className="cel-bairro">
            <i
              className="bolinha"
              style={{
                background: `var(--ag-${t(b).vencedor === candA.id ? "lula" : "flavio"})`,
              }}
            />
            <span className="cel-bairro__nome">{porCandidato(t(b).vencedor).nome}</span>
          </span>
        ),
      },
    ];
  }, [vista, metrica, divergente, maxBarra]);

  const [ordem, setOrdem] = useState<{ col: string; desc: boolean }>({
    col: "eleitorado",
    desc: true,
  });

  const colOrdem = colunas.find((c) => c.id === ordem.col) ?? colunas[0];

  const linhas = useMemo(() => {
    const copia = [...bairros];
    copia.sort((a, b) => {
      const va = colOrdem.ordenar(a);
      const vb = colOrdem.ordenar(b);
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "pt-BR");
      return ordem.desc ? -cmp : cmp;
    });
    return copia;
  }, [colOrdem, ordem.desc]);

  const template = colunas.map((c) => c.largura).join(" ");

  return (
    <div className="tabela-bairros">
      <div className="bloco__cab">
        <h3>Todos os {bairros.length} bairros</h3>
        <p className="bloco__nota">
          Bairro conforme o campo <code>NM_BAIRRO</code> do TSE, que descreve o local de votacao. A
          barra mostra a metrica selecionada. Clique no cabecalho para ordenar, ou numa linha para
          abrir o bairro.
        </p>
      </div>

      <div className="ag-table" role="table" aria-label={`Bairros por ${metrica.rotulo}`}>
        <div className="ag-table__head" style={{ gridTemplateColumns: template }} role="row">
          {colunas.map((c) => (
            <span
              key={c.id}
              role="columnheader"
              title={c.titulo}
              className={c.num ? "num" : ""}
              aria-sort={ordem.col === c.id ? (ordem.desc ? "descending" : "ascending") : "none"}
              onClick={() =>
                setOrdem((o) => (o.col === c.id ? { col: c.id, desc: !o.desc } : { col: c.id, desc: true }))
              }
            >
              {c.rotulo}
              {ordem.col === c.id && <span className="seta">{ordem.desc ? "▼" : "▲"}</span>}
            </span>
          ))}
        </div>

        <div className="ag-table__body" role="rowgroup">
          {linhas.map((b) => (
            <div
              key={b.id}
              role="row"
              className="ag-table__row"
              style={{ gridTemplateColumns: template }}
              aria-selected={b.id === selecionado}
              onClick={() => onSelecionar(b.id)}
            >
              {colunas.map((c) => (
                <span key={c.id} role="cell" className={`${c.num ? "num" : ""} ${c.classe?.(b) ?? ""}`}>
                  {c.conteudo(b)}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="bloco__nota" style={{ marginTop: 12 }}>
        Fonte: TSE, {metrica.fonte}.
      </p>
    </div>
  );
}
