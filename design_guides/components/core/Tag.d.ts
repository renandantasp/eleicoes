import type { ReactNode } from 'react';
/** @startingPoint section="Base" subtitle="Etiquetas Oficial / Ressalva / Fonte" viewport="700x150" */
export interface TagProps {
  /** oficial = dado do TSE/IBGE; ressalva/lacuna = limite declarado; apresentacao = escolha de design; fonte = nome do campo/arquivo */
  kind?: 'oficial' | 'ressalva' | 'lacuna' | 'apresentacao' | 'fonte';
  children: ReactNode;
}
export declare function Tag(props: TagProps): JSX.Element;
