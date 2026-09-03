import { Image, StyleSheet, View } from 'react-native';

import type { BlockKind } from '@/engine';
import { terrainColors } from '@/theme';

const bushArt = require('@/assets/images/terrain/bush.png');

type Props = {
  terrain: BlockKind;
  /** 1マスの辺長(px)。茂み画像をパーセント指定にするとreact-native-webで高さ0になることがあるため、実寸で渡す。 */
  size: number;
};

/**
 * 盤面1マス分のブロック。land と void は呼び出し側（board.tsx）で描画しない。
 * wallは切り抜き済みの茂み画像をマスにそのまま置くだけ（枠・背景なし）。
 */
export function BoardCell({ terrain, size }: Props) {
  if (terrain === 'wall') {
    return <Image source={bushArt} resizeMode="contain" style={{ width: size, height: size }} />;
  }
  const palette = terrainColors[terrain];
  return <View style={[styles.tile, { backgroundColor: palette.fill }]} />;
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
  },
});
