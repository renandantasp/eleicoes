import React from 'react';
export function Callout({ tone = 'neutral', children }) {
  return <div className={'ag-callout' + (tone !== 'neutral' ? ' ag-callout--' + tone : '')} role={tone === 'flip' ? 'status' : undefined}>{children}</div>;
}
