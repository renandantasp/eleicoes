import type { ReactNode, ButtonHTMLAttributes } from 'react';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = ação pontual (Limpar seleção); ghost = ação secundária (ordenar, ir para Araraquara) */
  variant?: 'primary' | 'ghost';
  children: ReactNode;
}
export declare function Button(props: ButtonProps): JSX.Element;
