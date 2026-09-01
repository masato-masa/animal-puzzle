import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StageGameView } from '@/components/stage-game-view';
import type { Stage } from '@/engine';
import { getNextStage, getStage } from '@/levels/stages';
import { getCustomStage } from '@/storage/custom-stages';
import { recordClear } from '@/storage/progress';
import { colors } from '@/theme';

export default function GameScreen() {
  const { stageId } = useLocalSearchParams<{ stageId: string }>();
  const router = useRouter();
  const staticStage = getStage(stageId);
  /** undefined = カスタムステージをまだ確認していない。null = 確認したが無かった。 */
  const [customStage, setCustomStage] = useState<Stage | undefined | null>(undefined);

  useEffect(() => {
    if (staticStage) return;
    let active = true;
    getCustomStage(stageId).then((stage) => {
      if (active) setCustomStage(stage ?? null);
    });
    return () => {
      active = false;
    };
  }, [stageId, staticStage]);

  const stage = staticStage ?? customStage ?? undefined;
  const isCustom = !staticStage;
  const stillLooking = !staticStage && customStage === undefined;

  if (!stage) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: stillLooking ? '読み込み中…' : 'ステージが見つかりません' }} />
        <Text style={styles.missingText}>
          {stillLooking ? '読み込み中…' : `ステージ「${stageId}」は存在しません。`}
        </Text>
      </View>
    );
  }

  const nextStage = isCustom ? undefined : getNextStage(stage.id);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: stage.name }} />
      <StageGameView
        key={stage.id}
        stage={stage}
        hasNext={!!nextStage}
        onCleared={() => {
          recordClear(stage.id);
        }}
        onNext={() => {
          if (nextStage) router.replace({ pathname: '/game/[stageId]', params: { stageId: nextStage.id } });
        }}
        onBack={() => router.back()}
        onList={() => router.replace(isCustom ? '/my-stages' : '/')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  missingText: {
    color: colors.text,
    fontWeight: '700',
  },
});
