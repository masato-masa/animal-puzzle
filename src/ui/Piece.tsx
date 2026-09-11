import type { CSSProperties } from 'react';

import type { Species } from '@/engine';
import { speciesVars } from '@/art/palette';
import { speciesSprite } from '@/art/sprites';

type Props = {
  species: Species;
  /** 何マス分か。gap をまたいで 1 枚の角丸ブロックとして描くために使う。 */
  w: number;
  h: number;
  violating?: boolean;
  /** 残数 0 のカードなど、存在は見せるが主張を下げたいとき。 */
  dimmed?: boolean;
  /** ドラッグ中。追従表示を別に描くので本体は隠すが、場所は空けない。 */
  hidden?: boolean;
};

/**
 * 駒 1 個。盤面でもカードでも同じ見た目にすることで、つまんだ瞬間に姿が変わらない。
 * 大きさは親が持つ --cell / --gap から決まるので、ここでは px を指定しない。
 */
export function Piece({ species, w, h, violating, dimmed, hidden }: Props) {
  return (
    <div
      className="piece"
      style={{ ...speciesVars(species), '--w': w, '--h': h } as CSSProperties}
      data-violating={violating ? 'true' : undefined}
      data-dimmed={dimmed ? 'true' : undefined}
      data-hidden={hidden ? 'true' : undefined}>
      {/* 画像は footprint と同じ縦横比のキャンバスに収めてあるので、
          そのまま敷けば位置合わせが要らない。 */}
      <img className="piece-art" src={speciesSprite[species]} alt="" draggable={false} />
    </div>
  );
}
