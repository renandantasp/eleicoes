import React from 'react';
const pct = v => (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
export function VoteSplit({ rows, shiftLabel }) {
  return (
    <div className="ag-panel__section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong style={{ fontSize: 13 }}>Voto a dois</strong><span className="ag-label" style={{ textTransform: 'none' }}>Lula ÷ (Lula + Flávio)</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="ag-split">
          <span className="ag-split__label">{r.label}</span>
          <div className="ag-split__bar" role="img" aria-label={r.label + ': Lula ' + pct(r.share) + ', Flávio ' + pct(1 - r.share)}>
            <div className="ag-split__lula" style={{ width: r.share * 100 + '%' }} />
            <div className="ag-split__mid" />
            <span className="ag-split__l">{pct(r.share)}</span><span className="ag-split__f">{pct(1 - r.share)}</span>
          </div>
        </div>
      ))}
      {shiftLabel && <strong style={{ fontSize: 13, fontWeight: 500 }}>{shiftLabel}</strong>}
    </div>
  );
}
