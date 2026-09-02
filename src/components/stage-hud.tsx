import { StyleSheet, Text, View } from 'react-native';

import { colors, ui } from '@/theme';

import { ActionButton } from './action-button';

type Props = {
  remaining: number;
  onReset: () => void;
};

export function StageHud({ remaining, onReset }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Text style={styles.statLabel}>のこり</Text>
        <Text style={styles.statValue}>{remaining}</Text>
      </View>
      <ActionButton label="リセット" onPress={onReset} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  stat: {
    backgroundColor: colors.panel,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.panelBorder,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    ...ui.shadow,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  statValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 1,
  },
});
