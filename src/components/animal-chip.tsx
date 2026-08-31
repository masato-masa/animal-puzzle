import { Pressable, StyleSheet, Text, View } from 'react-native';

import { boundingBox, type Species } from '@/engine';
import { colors, speciesEmoji, ui } from '@/theme';

/** トレイのミニプレビューの1マス分の単位px。 */
const CHIP_UNIT = 24;

type Props = {
  species: Species;
  selected?: boolean;
  onPress: () => void;
};

/** トレイ用の単一チップ。形状のミニプレビュー（横長/縦長/正方形）を反映する。 */
export function AnimalChip({ species, selected, onPress }: Props) {
  const { w, h } = boundingBox(species);
  return (
    <Pressable onPress={onPress} style={styles.wrapper}>
      <View
        style={[
          styles.chip,
          {
            width: w * CHIP_UNIT,
            height: h * CHIP_UNIT,
            borderColor: selected ? colors.validTargetEdge : colors.panelBorder,
            borderWidth: selected ? 3 : 2,
            backgroundColor: selected ? 'rgba(255, 214, 92, 0.35)' : colors.panel,
          },
        ]}>
        <Text style={styles.icon}>{speciesEmoji[species]}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    margin: 4,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    ...ui.shadow,
  },
  icon: {
    fontSize: 20,
  },
});
