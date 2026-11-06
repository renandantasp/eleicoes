import React from 'react';
export function MapTooltip({ title, value, meta, style }) {
  return (
    <div className="ag-tooltip" style={style}>
      <span className="ag-tooltip__title">{title}</span>
      <span className="ag-tooltip__value">{value}</span>
      <span className="ag-tooltip__meta">{meta}</span>
    </div>
  );
}
