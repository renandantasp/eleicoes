/** @startingPoint section="Dados" subtitle="Voto a dois nos dois turnos" viewport="380x180" */
export interface VoteSplitProps {
  /** share = Lula/(Lula+Flávio), 0–1. Normalmente 2 linhas: 1º e 2º turno. */
  rows: { label: string; share: number }[];
  /** "+2,8 pp para Lula no voto a dois" */
  shiftLabel?: string;
}
export declare function VoteSplit(props: VoteSplitProps): JSX.Element;
