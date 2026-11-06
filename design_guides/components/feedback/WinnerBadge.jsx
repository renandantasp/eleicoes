import React from 'react';
export function WinnerBadge({ who, margin, turn = '2º turno' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span className={'ag-winner ag-winner--' + who}>{who === 'lula' ? 'Lula' : 'Flávio Bolsonaro'} venceu o {turn}</span>
      {margin && <span style={{ font: '500 13px var(--ag-font-mono)' }}>{margin}</span>}
    </div>
  );
}
