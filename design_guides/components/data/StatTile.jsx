import React from 'react';
export function StatTile({ label, value, note, tone }) {
  return (
    <div className={'ag-tile' + (tone ? ' ag-tile--' + tone : '')}>
      <span className="ag-tile__label">{label}</span>
      <span className="ag-tile__value">{value}</span>
      {note && <span className="ag-tile__note">{note}</span>}
    </div>
  );
}
