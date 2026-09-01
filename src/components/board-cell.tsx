import { StyleSheet, View } from 'react-native';

import type { Terrain } from '@/engine';
import { colors, terrainColors } from '@/theme';

type Props = {
  terrain: Terrain | 'wall';
};

/** 盤面1マス分の地形背景。voidマスは呼び出し側（board.tsx）でそもそも描画しない。 */
export function BoardCell({ terrain }: Props) {
  const palette = terrainColors[terrain];
  return (
    <View style={[styles.tile, { backgroundColor: palette.fill, borderColor: palette.dark }]}>
      {terrain === 'wall' ? <Bush /> : null}
    </View>
  );
}

/** 配置不可マスを「草木」で表現する。画像アセット無しで葉の塊を重ねて茂みに見せる。 */
function Bush() {
  return (
    <View style={styles.bush} pointerEvents="none">
      <View style={[styles.leaf, styles.leafBack]} />
      <View style={[styles.leaf, styles.leafLeft]} />
      <View style={[styles.leaf, styles.leafRight]} />
      <View style={[styles.leaf, styles.leafTop]} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  bush: {
    flex: 1,
  },
  leaf: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: colors.bushLeaf,
    borderWidth: 1.5,
    borderColor: colors.bushLeafEdge,
  },
  leafBack: {
    width: '78%',
    height: '62%',
    left: '11%',
    top: '30%',
    backgroundColor: colors.bushLeafDark,
    borderColor: colors.bushLeafDarkEdge,
  },
  leafLeft: {
    width: '52%',
    height: '52%',
    left: '2%',
    top: '38%',
  },
  leafRight: {
    width: '52%',
    height: '52%',
    left: '46%',
    top: '38%',
  },
  leafTop: {
    width: '56%',
    height: '48%',
    left: '22%',
    top: '14%',
  },
});
