import { Image, StyleSheet, Text, View } from 'react-native';

import type { Species } from '@/engine';
import { speciesArt } from '@/lib/animal-art';
import { colors, speciesEmoji, ui } from '@/theme';

type Props = {
  species: Species;
  violating?: boolean;
  /** ドラッグ中の本体を隠す時に使う。マウント自体は維持しないとドラッグ操作が途中で切れてしまう。 */
  hidden?: boolean;
  /** ピース全体のpx寸法。Imageのサイズをパーセント指定にするとreact-native-webで高さ0になることがあるため、実寸で渡す。 */
  size: { w: number; h: number };
};

/**
 * 盤面上に配置されたピースの見た目。イラストを持つ種は、カードで囲わず
 * 画像そのものをピースとして footprint いっぱいに表示する（縦横比が合わない
 * 場合は引き伸ばして埋める）。違反中はふちを赤くする。
 * イラストの無い種（ワニ・ウシツツキ等）は従来どおり絵文字カードで表示する。
 */
export function AnimalPiece({ species, violating, hidden, size }: Props) {
  const art = speciesArt[species];

  if (art) {
    return (
      <View style={[styles.artWrap, hidden && styles.hidden]}>
        <Image
          source={art}
          resizeMode="stretch"
          style={[
            { width: size.w, height: size.h },
            styles.artImage,
            violating && styles.artViolating,
          ]}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.piece,
        {
          borderColor: violating ? colors.violationEdge : colors.panelBorder,
          borderWidth: violating ? 3 : 2,
          backgroundColor: violating ? 'rgba(232, 56, 47, 0.22)' : colors.panel,
        },
        hidden && styles.hidden,
      ]}>
      <Text style={styles.icon}>{speciesEmoji[species]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  artWrap: {
    ...ui.shadow,
  },
  artImage: {
    borderRadius: 8,
    borderWidth: 0,
  },
  artViolating: {
    borderWidth: 3,
    borderColor: colors.violationEdge,
  },
  piece: {
    flex: 1,
    margin: 2,
    borderRadius: ui.radius * 0.6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...ui.shadow,
  },
  icon: {
    fontSize: 22,
  },
  hidden: {
    opacity: 0,
  },
});
