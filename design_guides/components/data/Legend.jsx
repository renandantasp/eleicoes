import React from 'react';
/** rows: 2 (divergente) ou 1 (sequencial); cada uma com 5 células. */
export function Legend({ title, unit, rows, footnote }) {
  return (
    <div className="ag-legend">
      <div className="ag-legend__head"><span>{title}</span><span className="ag-tag ag-tag--fonte">{unit}</span></div>
      {rows.map((r, i) => (
        <div key={i} className="ag-legend__row">
          <span className="ag-legend__pole">{r.label}</span>
          {r.cells.map((c, j) => (
            <div key={j} className="ag-legend__cell" data-empty={c.count === 0}>
              <div className="ag-legend__swatch" style={{ background: c.color }}>{c.count}</div>
              <span className="ag-legend__range">{c.range}</span>
            </div>
          ))}
        </div>
      ))}
      {footnote && <span className="ag-legend__foot">{footnote}</span>}
    </div>
  );
}
