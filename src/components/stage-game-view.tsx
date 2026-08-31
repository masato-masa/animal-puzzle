import { useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import {
  animalAt,
  createGameState,
  isStageCleared,
  placeAnimal,
  resetStage,
  returnPieceAt,
  validAnchorCells,
  violatingAnimals,
  type GameState,
  type Pos,
  type Stage,
} from '@/engine';
import { colors } from '@/theme';

import { BackButton } from './back-button';
import { Board } from './board';
import { ClearOverlay } from './clear-overlay';
import { StageHud } from './stage-hud';
import { Tray } from './tray';

type Props = {
  stage: Stage;
  hasNext: boolean;
  onCleared: () => void;
  onNext: () => void;
  onBack: () => void;
  onList: () => void;
};

/** 1ステージの画面全体を統括する。engineへの呼び出しはこのコンポーネントに集約する。 */
export function StageGameView({ stage, hasNext, onCleared, onNext, onBack, onList }: Props) {
  const [state, setState] = useState<GameState>(() => createGameState(stage));
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [cell, setCell] = useState(40);
  const clearedNotified = useRef(false);

  const violatingIds = new Set(violatingAnimals(state).map((a) => a.instanceId));
  const validAnchors = selectedInstanceId ? validAnchorCells(state, selectedInstanceId) : null;
  const cleared = isStageCleared(state);

  useEffect(() => {
    if (cleared && !clearedNotified.current) {
      clearedNotified.current = true;
      onCleared();
    }
    if (!cleared) clearedNotified.current = false;
  }, [cleared, onCleared]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    setCell(Math.max(18, Math.min(64, Math.floor(width / stage.cols))));
  };

  const handleCellPress = (pos: Pos) => {
    const existing = animalAt(state, pos);
    if (existing) {
      setState((s) => returnPieceAt(s, pos));
      setSelectedInstanceId(null);
      return;
    }
    if (!selectedInstanceId) return;
    setState((s) => {
      const next = placeAnimal(s, selectedInstanceId, pos);
      if (next !== s) setSelectedInstanceId(null);
      return next;
    });
  };

  const handleSelectTray = (instanceId: string) => {
    setSelectedInstanceId((prev) => (prev === instanceId ? null : instanceId));
  };

  const handleReset = () => {
    setState((s) => resetStage(s));
    setSelectedInstanceId(null);
  };

  const handleRetry = () => {
    setState(createGameState(stage));
    setSelectedInstanceId(null);
    clearedNotified.current = false;
  };

  return (
    <View style={styles.container}>
      <BackButton onPress={onBack} />
      <Text style={styles.title}>{stage.name}</Text>

      <View style={styles.boardArea} onLayout={handleLayout}>
        <Board
          state={state}
          cell={cell}
          violatingIds={violatingIds}
          validAnchors={validAnchors}
          onCellPress={handleCellPress}
        />
      </View>

      <Tray tray={state.tray} selectedInstanceId={selectedInstanceId} onSelect={handleSelectTray} />
      <StageHud remaining={state.tray.length} onReset={handleReset} />

      {cleared ? <ClearOverlay hasNext={hasNext} onNext={onNext} onRetry={handleRetry} onList={onList} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.skyBottom,
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 16,
    gap: 16,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  boardArea: {
    width: '100%',
    alignItems: 'center',
  },
});
