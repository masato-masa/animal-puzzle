import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { SPECIES, type Species } from '@/engine';
import { speciesArt } from '@/lib/animal-art';
import { conditionText } from '@/lib/condition-text';
import { colors, speciesEmoji, speciesLabel, ui } from '@/theme';

type Props = {
  species: Species[];
  expanded: boolean;
  onToggleExpanded: () => void;
};

/** このステージに登場する動物の配置条件を一覧表示する。折りたたみボタンは箱自身のヘッダーに置く。 */
export function ConditionsPanel({ species, expanded, onToggleExpanded }: Props) {
  return (
    <View style={styles.panel}>
      <Pressable style={styles.header} onPress={onToggleExpanded}>
        <Text style={styles.headerLabel}>じょうけん</Text>
        <Text style={styles.headerToggle}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded
        ? species.map((sp) => {
            const conditions = SPECIES[sp].conditions;
            const art = speciesArt[sp];
            return (
              <View key={sp} style={styles.row}>
                {art ? (
                  <Image source={art} resizeMode="cover" style={styles.art} />
                ) : (
                  <Text style={styles.emoji}>{speciesEmoji[sp]}</Text>
                )}
                <View style={styles.textCol}>
                  <Text style={styles.name}>{speciesLabel[sp]}</Text>
                  {conditions.length === 0 ? (
                    <Text style={styles.condition}>とくに条件なし</Text>
                  ) : (
                    conditions.map((c, i) => (
                      <Text key={i} style={styles.condition}>
                        ・{conditionText(c)}
                      </Text>
                    ))
                  )}
                </View>
              </View>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.panel,
    borderRadius: ui.radius,
    borderWidth: 2,
    borderColor: colors.panelBorder,
    padding: 12,
    gap: 10,
    ...ui.shadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLabel: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 14,
  },
  headerToggle: {
    color: colors.textMuted,
    fontWeight: '900',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  art: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  emoji: {
    width: 36,
    height: 36,
    fontSize: 24,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  textCol: {
    flex: 1,
    gap: 1,
  },
  name: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 13,
  },
  condition: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 12,
  },
});
