import React from 'react';
/** Barra dentro da célula da tabela. Divergente cresce a partir do centro. */
export function InlineBar({ value, max, color, diverging }) {
  const m = max || 1;
  const w = diverging ? Math.abs(value) / m * 50 : value / m * 100;
  const left = diverging ? (value >= 0 ? 50 : 50 - w) : 0;
  return (
    <div className={'ag-ibar' + (diverging ? ' ag-ibar--div' : '')}>
      <div className="ag-ibar__fill" style={{ left: left + '%', width: w + '%', background: color }} />
    </div>
  );
}
