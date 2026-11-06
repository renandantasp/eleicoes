/**
 * Componentes do design system Grade, em TypeScript.
 *
 * Traducao de design_guides/components/**, mantendo os mesmos nomes e as
 * mesmas classes `ag-*`. A aparencia vive toda em styles/grade/components.css;
 * aqui so ha estrutura e acessibilidade.
 */

import type { ReactNode } from "react";

// --------------------------------------------------------------------- core

export function Tag({
  kind = "fonte",
  children,
}: {
  kind?: "fonte" | "oficial" | "ressalva" | "lacuna" | "apresentacao";
  children: ReactNode;
}) {
  return <span className={`ag-tag ag-tag--${kind}`}>{children}</span>;
}

export interface ItemAba {
  id: string;
  label: string;
  sub?: string;
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: ItemAba[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <nav className="ag-tabs" aria-label="Visualizacoes">
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          className="ag-tab"
          aria-current={t.id === value ? "page" : undefined}
          onClick={() => onChange(t.id)}
        >
          <span className="ag-tab__label">{t.label}</span>
          {t.sub && <span className="ag-tab__sub">{t.sub}</span>}
        </button>
      ))}
    </nav>
  );
}

export interface ItemMetrica {
  id: string;
  label: string;
  unit: string;
}

export function MetricList({
  items,
  value,
  onChange,
  label = "Cor dos circulos",
}: {
  items: ItemMetrica[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  return (
    <div className="ag-metrics" role="group" aria-label={label}>
      {items.map((m) => (
        <button
          key={m.id}
          type="button"
          className="ag-metric"
          aria-pressed={m.id === value}
          onClick={() => onChange(m.id)}
        >
          <span className="ag-metric__label">{m.label}</span>
          <span className="ag-metric__unit">{m.unit}</span>
        </button>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label?: string;
}) {
  return (
    <div className="ag-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className="ag-seg__item"
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Button({
  variant = "primary",
  children,
  ...rest
}: { variant?: "primary" | "ghost"; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`ag-btn${variant === "ghost" ? " ag-btn--ghost" : ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// --------------------------------------------------------------------- dado

export interface CelulaLegenda {
  color: string;
  /** quantos bairros caem na faixa; 0 nao significa faixa vazia */
  count: number;
  range: string;
  /** sem bairro E sem local: a faixa e esmaecida */
  vazia: boolean;
}

export interface LinhaLegenda {
  label: string;
  cells: CelulaLegenda[];
}

export function Legend({
  title,
  unit,
  rows,
  footnote,
}: {
  title: string;
  unit: string;
  rows: LinhaLegenda[];
  footnote?: ReactNode;
}) {
  return (
    <div className="ag-legend">
      <div className="ag-legend__head">
        <span>{title}</span>
        <span className="ag-tag ag-tag--fonte">{unit}</span>
      </div>
      {rows.map((r) => (
        <div key={r.label} className="ag-legend__row">
          <span className="ag-legend__pole">{r.label}</span>
          {r.cells.map((c) => (
            <div key={c.range} className="ag-legend__cell" data-empty={c.vazia}>
              <div className="ag-legend__swatch" style={{ background: c.color }}>
                {c.count > 0 ? c.count : ""}
              </div>
              <span className="ag-legend__range">{c.range}</span>
            </div>
          ))}
        </div>
      ))}
      {footnote && <span className="ag-legend__foot">{footnote}</span>}
    </div>
  );
}

const pctBarra = (v: number) =>
  `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

/** Voto a dois: a barra que da forma visual ao conceito central da aba Diferenca. */
export function VoteSplit({
  rows,
  shiftLabel,
  nomeA,
  nomeB,
}: {
  rows: { label: string; share: number }[];
  shiftLabel?: string;
  nomeA: string;
  nomeB: string;
}) {
  return (
    <div className="ag-panel__section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <strong style={{ fontSize: 13 }}>Voto a dois</strong>
        <span className="ag-label" style={{ textTransform: "none" }}>
          {nomeA} / ({nomeA} + {nomeB})
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.label} className="ag-split">
          <span className="ag-split__label">{r.label}</span>
          <div
            className="ag-split__bar"
            role="img"
            aria-label={`${r.label}: ${nomeA} ${pctBarra(r.share)}, ${nomeB} ${pctBarra(1 - r.share)}`}
          >
            <div className="ag-split__lula" style={{ width: `${r.share * 100}%` }} />
            <div className="ag-split__mid" />
            <span className="ag-split__l">{pctBarra(r.share)}</span>
            <span className="ag-split__f">{pctBarra(1 - r.share)}</span>
          </div>
        </div>
      ))}
      {shiftLabel && <strong style={{ fontSize: 13, fontWeight: 500 }}>{shiftLabel}</strong>}
    </div>
  );
}

export interface BarraCandidato {
  key: string;
  label: string;
  number: string;
  tseName: string;
  share: number;
  color: string;
}

export function CandidateBars({ items }: { items: BarraCandidato[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((c) => (
        <div key={c.key} className="ag-cand" title={c.tseName}>
          <span className="ag-cand__name">
            {c.label} &middot; {c.number}
          </span>
          <span className="ag-cand__pct">{pctBarra(c.share)}</span>
          <div className="ag-cand__track">
            <div
              className="ag-cand__fill"
              style={{ width: `${c.share * 100}%`, background: c.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Barra dentro da celula da tabela. Divergente cresce a partir do centro. */
export function InlineBar({
  value,
  max,
  color,
  diverging,
}: {
  value: number;
  max: number;
  color: string;
  diverging?: boolean;
}) {
  const m = max || 1;
  const w = diverging ? (Math.abs(value) / m) * 50 : (Math.max(0, value) / m) * 100;
  const left = diverging ? (value >= 0 ? 50 : 50 - w) : 0;
  return (
    <div className={`ag-ibar${diverging ? " ag-ibar--div" : ""}`}>
      <div
        className="ag-ibar__fill"
        style={{ left: `${left}%`, width: `${Math.min(w, 100)}%`, background: color }}
      />
    </div>
  );
}

export function StatTile({
  label,
  value,
  note,
  tone,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  tone?: "lula" | "flavio";
  className?: string;
}) {
  return (
    <div className={`ag-tile${tone ? ` ag-tile--${tone}` : ""}${className ? ` ${className}` : ""}`}>
      <span className="ag-tile__label">{label}</span>
      <span className="ag-tile__value">{value}</span>
      {note && <span className="ag-tile__note">{note}</span>}
    </div>
  );
}

export function MiniStat({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="ag-mini">
      <span className="ag-mini__label">{label}</span>
      <span className="ag-mini__value">{value}</span>
    </div>
  );
}

// ----------------------------------------------------------------- feedback

export function ProvenanceBar({
  dates = [],
  notes = [],
  escondida = false,
  onIrParaRessalvas,
  children,
}: {
  /** datas do pleito; omitir deixa a faixa sem elas */
  dates?: string[];
  /** avisos curtos ao lado das datas, igualmente opcionais */
  notes?: string[];
  /** recolhe a faixa para fora da tela, sem tirar o conteudo do DOM */
  escondida?: boolean;
  onIrParaRessalvas: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="ag-provenance" role="note" data-escondida={escondida || undefined}>
      <span className="ag-provenance__live">Dados oficiais do TSE e do IBGE</span>
      {[...dates, ...notes].map((d) => (
        <span key={d} className="ag-provenance__muted">
          {d}
        </span>
      ))}
      <button type="button" className="ag-provenance__link" onClick={onIrParaRessalvas}>
        3 ressalvas &darr;
      </button>
      {children}
    </div>
  );
}

export function Callout({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "flip" | "destaque";
  children: ReactNode;
}) {
  return (
    <div
      className={`ag-callout${tone !== "neutral" ? ` ag-callout--${tone}` : ""}`}
      role={tone === "flip" ? "status" : undefined}
    >
      {children}
    </div>
  );
}

export function WinnerBadge({
  nome,
  tone,
  margin,
  turn = "2o turno",
}: {
  nome: string;
  tone: "lula" | "flavio";
  margin?: string;
  turn?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span className={`ag-winner ag-winner--${tone}`}>
        {nome} venceu o {turn}
      </span>
      {margin && <span style={{ font: "500 13px var(--ag-font-mono)" }}>{margin}</span>}
    </div>
  );
}
