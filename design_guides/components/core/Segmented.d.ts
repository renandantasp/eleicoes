export interface SegmentedProps {
  /** 2–3 opções curtas. Ex.: Núcleo urbano / Município inteiro; Percentual / Absoluto. */
  options: { id: string; label: string }[];
  value: string;
  onChange?: (id: string) => void;
}
export declare function Segmented(props: SegmentedProps): JSX.Element;
