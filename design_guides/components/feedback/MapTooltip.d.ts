import type { CSSProperties } from 'react';
export interface MapTooltipProps {
  /** nome do local de votação */
  title: string;
  /** valor da métrica ativa, já formatado */
  value: string;
  /** "Bairro · 3.120 eleitores · 11 seções" */
  meta: string;
  style?: CSSProperties;
}
export declare function MapTooltip(props: MapTooltipProps): JSX.Element;
