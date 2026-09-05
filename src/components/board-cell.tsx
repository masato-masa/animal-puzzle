import { Image, StyleSheet } from 'react-native';

import type { BlockKind } from '@/engine';

const bushArt = require('@/assets/images/terrain/bush.png');
const treeArt = require('@/assets/images/terrain/tree.png');
const waterArt = require('@/assets/images/terrain/water.png');

const terrainArt: Partial<Record<BlockKind, ReturnType<typeof require>>> = {
  wall: bushArt,
  tree: treeArt,
  water: waterArt,
};

type Props = {
  terrain: BlockKind;
  /** 1マスの辺長(px)。画像をパーセント指定にするとreact-native-webで高さ0になることがあるため、実寸で渡す。 */
  size: number;
};

/** 盤面1マス分のブロック。land と void は呼び出し側（board.tsx）で描画しない。 */
export function BoardCell({ terrain, size }: Props) {
  const art = terrainArt[terrain];
  if (!art) return null;
  return <Image source={art} resizeMode="contain" style={[styles.image, { width: size, height: size }]} />;
}

const styles = StyleSheet.create({
  image: {
    alignSelf: 'center',
  },
});
