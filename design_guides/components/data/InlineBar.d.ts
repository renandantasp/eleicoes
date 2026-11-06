export interface InlineBarProps {
  value: number;
  /** maior |valor| da lista */
  max: number;
  /** cor da faixa do valor (mesma do mapa) */
  color: string;
  diverging?: boolean;
}
export declare function InlineBar(props: InlineBarProps): JSX.Element;
