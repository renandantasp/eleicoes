import React from 'react';
export function ProvenanceBar({ dates = ['1º turno 04/10/2026', '2º turno 25/10/2026'], href = '#sobre' }) {
  return (
    <div className="ag-provenance" role="note">
      <span className="ag-provenance__live">Dados oficiais do TSE e do IBGE</span>
      {dates.map(d => <span key={d} className="ag-provenance__muted">{d}</span>)}
      <span className="ag-provenance__muted">nada estimado ou interpolado</span>
      <a className="ag-provenance__link" href={href}>3 ressalvas ↓</a>
    </div>
  );
}
