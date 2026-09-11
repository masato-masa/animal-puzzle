import type { CSSProperties } from 'react';

import type { Species } from '@/engine';
import { speciesVars } from '@/art/palette';
import { SpeciesSilhouette } from '@/art/species';

type Props = {
  species: Species;
  /** 何マス分か。gap をまたいで 1 枚の角丸ブロックとして描くために使う。 */
  w: number;
  h: number;
  violating?: boolean;
  /** 残数 0 のカードなど、存在は見せるが主張を下げたいとき。 */
  dimmed?: boolean;
};

/**
 * 駒 1 個。盤面でもカードでも同じ見た目にすることで、つまんだ瞬間に姿が変わらない。
 * 大きさは親が持つ --cell / --gap から決まるので、ここでは px を指定しない。
 */
export function Piece({ species, w, h, violating, dimmed }: Props) {
  return (
    <div
      className="piece"
      style={{ ...speciesVars(species), '--w': w, '--h': h } as CSSProperties}
      data-violating={violating ? 'true' : undefined}
      data-dimmed={dimmed ? 'true' : undefined}>
      <SpeciesSilhouette species={species} />
    </div>
  );
}
