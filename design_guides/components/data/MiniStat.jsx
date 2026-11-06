import React from 'react';
export function MiniStat({ label, value }) {
  return <div className="ag-mini"><span className="ag-mini__label">{label}</span><span className="ag-mini__value">{value}</span></div>;
}
