export interface CandidateBarItem {
  label: string;
  /** nome como o TSE publica — vai no title */
  tseName?: string;
  number?: string;
  /** 0–1 dos válidos */
  share: number;
  /** var(--ag-lula) | var(--ag-flavio) | var(--ag-outros) */
  color: string;
}
export interface CandidateBarsProps { items: CandidateBarItem[] }
export declare function CandidateBars(props: CandidateBarsProps): JSX.Element;
