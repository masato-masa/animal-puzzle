import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/theme';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.skyBottom,
    card: colors.panel,
    text: colors.text,
    border: colors.panelBorder,
    primary: colors.accent,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.skyBottom },
        }}>
        <Stack.Screen name="index" options={{ title: '動物パズル' }} />
        <Stack.Screen name="game/[stageId]" options={{ title: '' }} />
      </Stack>
    </ThemeProvider>
  );
}
