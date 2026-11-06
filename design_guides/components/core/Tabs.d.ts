export interface TabItem { id: string; label: string; sub?: string; disabled?: boolean }
export interface TabsProps {
  /** As 4 abas: 1º turno, 2º turno, Diferença, Brasil. sub = data ou recorte. */
  items: TabItem[];
  value: string;
  onChange?: (id: string) => void;
}
export declare function Tabs(props: TabsProps): JSX.Element;
