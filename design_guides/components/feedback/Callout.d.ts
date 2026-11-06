import type { ReactNode } from 'react';
export interface CalloutProps {
  /** flip = bairro mudou de lado; destaque = alerta Araraquara (violeta) em Insights; neutral = nota */
  tone?: 'neutral' | 'flip' | 'destaque';
  children: ReactNode;
}
export declare function Callout(props: CalloutProps): JSX.Element;
