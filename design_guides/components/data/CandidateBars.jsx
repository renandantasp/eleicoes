import React from 'react';
const f = v => (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
export function CandidateBars({ items }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((c, i) => (
        <div key={i} className="ag-cand" title={c.tseName}>
          <span className="ag-cand__name">{c.label}{c.number ? ' · ' + c.number : ''}</span>
          <span className="ag-cand__pct">{f(c.share)}</span>
          <div className="ag-cand__track"><div className="ag-cand__fill" style={{ width: c.share * 100 + '%', background: c.color }} /></div>
        </div>
      ))}
    </div>
  );
}
