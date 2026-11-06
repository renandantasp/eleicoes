/** @startingPoint section="Dados" subtitle="Cartões de totais em grade" viewport="700x120" */
export interface StatTileProps {
  label: string;
  value: string;
  note?: string;
  /** colore o valor com a cor-texto da chapa; só para "mais votado" e votos ganhos */
  tone?: 'lula' | 'flavio';
}
export declare function StatTile(props: StatTileProps): JSX.Element;
