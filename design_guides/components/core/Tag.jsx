import React from 'react';
export function Tag({ kind = 'fonte', children }) {
  return <span className={'ag-tag ag-tag--' + kind}>{children}</span>;
}
