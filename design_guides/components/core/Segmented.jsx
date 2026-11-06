import React from 'react';
export function Segmented({ options, value, onChange }) {
  return (
    <div className="ag-seg">
      {options.map(o => (
        <button key={o.id} className="ag-seg__item" aria-pressed={o.id === value} onClick={() => onChange && onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}
