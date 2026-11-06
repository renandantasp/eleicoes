export interface MetricItem { id: string; label: string; /** "pp", "% dos válidos", "votos"… */ unit: string }
export interface MetricListProps {
  /** Sempre 5 métricas por aba. */
  items: MetricItem[];
  /** índice ativo; volta a 0 ao trocar de aba */
  value: number;
  onChange?: (index: number) => void;
  label?: string;
}
export declare function MetricList(props: MetricListProps): JSX.Element;
