import React from 'react';
export function Button({ variant = 'primary', children, ...rest }) {
  return <button className={'ag-btn' + (variant === 'ghost' ? ' ag-btn--ghost' : '')} {...rest}>{children}</button>;
}
