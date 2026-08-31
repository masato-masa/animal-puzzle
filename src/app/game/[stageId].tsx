import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { StageGameView } from '@/components/stage-game-view';
import { getNextStage, getStage } from '@/levels/stages';
import { recordClear } from '@/storage/progress';
import { colors } from '@/theme';

export default function GameScreen() {
  const { stageId } = useLocalSearchParams<{ stageId: string }>();
  const router = useRouter();
  const stage = getStage(stageId);

  if (!stage) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'ステージが見つかりません' }} />
        <Text style={styles.missingText}>ステージ「{stageId}」は存在しません。</Text>
      </View>
    );
  }

  const nextStage = getNextStage(stage.id);

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
        onList={() => router.replace('/')}
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
