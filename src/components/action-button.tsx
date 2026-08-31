import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, ui } from '@/theme';

type Tone = 'default' | 'primary' | 'success';

export function ActionButton({
  label,
  onPress,
  disabled,
  tone = 'default',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: Tone;
}) {
  const palette =
    tone === 'primary'
      ? { bg: colors.accent, edge: colors.accentDark, text: colors.text }
      : tone === 'success'
        ? { bg: colors.success, edge: colors.successDark, text: colors.textOnDark }
        : { bg: colors.panel, edge: colors.panelBorder, text: colors.text };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.bg,
          borderColor: palette.edge,
          borderBottomWidth: pressed ? 2 : 5,
          marginTop: pressed ? 3 : 0,
        },
        disabled && styles.buttonDisabled,
      ]}>
      <Text style={[styles.buttonLabel, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 11,
    paddingHorizontal: 18,
    minWidth: 104,
    alignItems: 'center',
    ...ui.shadow,
    shadowOffset: { width: 0, height: 2 },
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '900',
  },
});
