import React from 'react';
export function MetricList({ items, value, onChange, label = 'Cor dos círculos' }) {
  return (
    <div className="ag-metrics" role="group" aria-label={label}>
      {items.map((m, i) => (
        <button key={m.id} className="ag-metric" aria-pressed={i === value} onClick={() => onChange && onChange(i)}>
          <span className="ag-metric__label">{m.label}</span>
          <span className="ag-metric__unit">{m.unit}</span>
        </button>
      ))}
    </div>
  );
}
