import { Image, StyleSheet, Text, View } from 'react-native';

import { SPECIES, isSpeciesConditionSatisfied, isStageRuleSatisfied, type GameState, type Species } from '@/engine';
import { speciesArt } from '@/lib/animal-art';
import { conditionText, stageRuleText } from '@/lib/condition-text';
import { colors, speciesEmoji, speciesLabel, ui } from '@/theme';

type Props = {
  species: Species[];
  state: GameState;
};

const StatusMark = ({ ok }: { ok: boolean }) => (
  <Text style={[styles.mark, ok ? styles.markOk : styles.markNg]}>{ok ? '✓' : '✗'}</Text>
);

/**
 * このステージに登場する動物の性格と、ステージ限定ルールを一覧表示する。
 * 各行の左端に、今その条件が満たされているかを出す。開閉は呼び出し側が管理する。
 */
export function ConditionsPanel({ species, state }: Props) {
  const rules = state.stage.rules ?? [];
  return (
    <View style={styles.panel}>
      {species.map((sp) => {
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
                  <View key={i} style={styles.conditionRow}>
                    <StatusMark ok={isSpeciesConditionSatisfied(state, sp, c)} />
                    <Text style={styles.condition}>{conditionText(c)}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        );
      })}
      {rules.length > 0 && (
        <View style={styles.row}>
          <Text style={styles.emoji}>📋</Text>
          <View style={styles.textCol}>
            <Text style={styles.name}>このステージのやくそく</Text>
            {rules.map((r, i) => (
              <View key={i} style={styles.conditionRow}>
                <StatusMark ok={isStageRuleSatisfied(state, r)} />
                <Text style={styles.condition}>{stageRuleText(r)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
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
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mark: {
    fontSize: 14,
    fontWeight: '800',
    width: 16,
  },
  markOk: {
    color: colors.success,
  },
  markNg: {
    color: colors.danger,
  },
});
