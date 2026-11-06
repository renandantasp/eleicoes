import React from 'react';
export function Tabs({ items, value, onChange }) {
  return (
    <nav className="ag-tabs" role="tablist">
      {items.map(t => (
        <button key={t.id} role="tab" className="ag-tab" aria-current={t.id === value ? 'page' : undefined}
          disabled={t.disabled} onClick={() => onChange && onChange(t.id)}>
          <span className="ag-tab__label">{t.label}</span>
          {t.sub && <span className="ag-tab__sub">{t.sub}</span>}
        </button>
      ))}
    </nav>
  );
}
