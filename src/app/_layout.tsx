import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/theme';

/**
 * GitHub PagesのCDNが直前のデプロイ直後のJSバンドル404を誤ってキャッシュしてしまい、
 * 実際にはファイルが存在するのにずっと404を返す事故が起きた。ビルド成果物のハッシュは
 * バンドル内容から決まるため、コメント追加だけでは（ミニファイ後に差が出ず）ハッシュが
 * 変わらない。実行時に副作用を持つ最小限の文を入れてハッシュを変え、CDNの誤キャッシュを回避する。
 */
if (typeof globalThis !== 'undefined') {
  (globalThis as unknown as Record<string, string>).__buildMarker = '2026-09-03a';
}

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
        <Stack.Screen name="editor" options={{ title: 'ステージエディタ' }} />
        <Stack.Screen name="my-stages" options={{ title: 'マイステージ' }} />
      </Stack>
    </ThemeProvider>
  );
}
