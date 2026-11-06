/** @startingPoint section="Dados" subtitle="Legenda de forma fixa 5×2 / 5×1" viewport="700x200" */
export interface LegendCell { color: string; /** bairros nesta faixa */ count: number; /** "+5 a +10", "até −20" */ range: string }
export interface LegendRow { /** "↑ Lula à frente" | "menor → maior" */ label: string; cells: LegendCell[] }
export interface LegendProps {
  title: string;
  /** unidade aparece uma vez, no cabeçalho */
  unit: string;
  /** exatamente 2 linhas (divergente, 10 faixas) ou 1 (sequencial, 5 faixas) */
  rows: LegendRow[];
  footnote?: string;
}
export declare function Legend(props: LegendProps): JSX.Element;
