import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import {
  boundingBox,
  createGameState,
  isStageCleared,
  moveAnimal,
  placeAnimal,
  resetStage,
  returnToTray,
  violatingAnimals,
  type GameState,
  type Pos,
  type Species,
  type Stage,
} from '@/engine';
import { colors } from '@/theme';

import { AnimalPiece } from './animal-piece';
import { BackButton } from './back-button';
import { Board } from './board';
import { ClearOverlay } from './clear-overlay';
import { ConditionsPanel } from './conditions-panel';
import { ConfirmDialog } from './confirm-dialog';
import { useMeasuredRect } from './draggable';
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

type Drag =
  | {
      kind: 'board';
      instanceId: string;
      species: Species;
      originAnchor: Pos;
      startX: number;
      startY: number;
      dx: number;
      dy: number;
    }
  | {
      kind: 'tray';
      instanceId: string;
      species: Species;
      startX: number;
      startY: number;
      dx: number;
      dy: number;
    };

const inRect = (px: number, py: number, rect: { x: number; y: number; w: number; h: number } | null): boolean =>
  !!rect && px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;

/** 画面幅いっぱいから左右パディング分を引いた、盤面エリアに使える横幅の目安。 */
const BOARD_AREA_HORIZONTAL_PADDING = 32;

/** 1ステージの画面全体を統括する。engineへの呼び出しはこのコンポーネントに集約する。 */
export function StageGameView({ stage, hasNext, onCleared, onNext, onBack, onList }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const [state, setState] = useState<GameState>(() => createGameState(stage));
  const [drag, setDrag] = useState<Drag | null>(null);
  const [showConditions, setShowConditions] = useState(true);
  const [shake, setShake] = useState<{ id: string; token: number }>({ id: '', token: 0 });
  const [confirmingReset, setConfirmingReset] = useState(false);
  const clearedNotified = useRef(false);

  const triggerShake = (instanceId: string) => setShake((s) => ({ id: instanceId, token: s.token + 1 }));

  const root = useMeasuredRect();
  const boardArea = useMeasuredRect();
  const trayArea = useMeasuredRect();

  const availableWidth = Math.min(windowWidth - BOARD_AREA_HORIZONTAL_PADDING, 520);
  const cell = Math.max(18, Math.min(64, Math.floor(availableWidth / stage.cols)));

  const violatingIds = new Set(violatingAnimals(state).map((a) => a.instanceId));
  const cleared = isStageCleared(state);
  const uniqueSpecies = Array.from(new Set(stage.animals.map((a) => a.species)));

  useEffect(() => {
    if (cleared && !clearedNotified.current) {
      clearedNotified.current = true;
      onCleared();
    }
    if (!cleared) clearedNotified.current = false;
  }, [cleared, onCleared]);

  useEffect(() => {
    // レイアウトが落ち着いてから測る。フォント読み込み等での遅延ずれに強くするため少し待つ。
    const t = setTimeout(() => {
      root.measure();
      boardArea.measure();
      trayArea.measure();
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cell, stage.id, showConditions]);

  const handlePieceDragStart = (instanceId: string, species: Species, anchor: Pos, pageX: number, pageY: number) => {
    boardArea.measure();
    trayArea.measure();
    setDrag({ kind: 'board', instanceId, species, originAnchor: anchor, startX: pageX, startY: pageY, dx: 0, dy: 0 });
  };

  const handleChipDragStart = (instanceId: string, species: Species, pageX: number, pageY: number) => {
    boardArea.measure();
    trayArea.measure();
    setDrag({ kind: 'tray', instanceId, species, startX: pageX, startY: pageY, dx: 0, dy: 0 });
  };

  const handleDragMove = (dx: number, dy: number) => {
    setDrag((d) => (d ? { ...d, dx, dy } : d));
  };

  const handleDragEnd = (dx: number, dy: number) => {
    const d = drag;
    setDrag(null);
    if (!d) return;

    // つまんだ場所に関係なく、ピース自体の左上位置（つかんだ瞬間の位置＋移動量）を基準にする。
    // 縦2マスのピースの下半分をつまんでも、上半分をつまんでも同じように動く。
    const pieceLeft = d.startX + dx;
    const pieceTop = d.startY + dy;
    const box = boundingBox(d.species);
    const pieceCenterX = pieceLeft + (box.w * cell) / 2;
    const pieceCenterY = pieceTop + (box.h * cell) / 2;

    if (d.kind === 'board') {
      if (inRect(pieceCenterX, pieceCenterY, trayArea.rect)) {
        setState((s) => returnToTray(s, d.instanceId));
        return;
      }
      const board = boardArea.rect;
      const anchor: Pos = board
        ? { r: Math.round((pieceTop - board.y) / cell), c: Math.round((pieceLeft - board.x) / cell) }
        : d.originAnchor;
      const next = moveAnimal(state, d.instanceId, anchor);
      if (next === state) triggerShake(d.instanceId);
      else setState(next);
    } else {
      const board = boardArea.rect;
      if (!board) return;
      const anchor: Pos = {
        r: Math.round((pieceTop - board.y) / cell),
        c: Math.round((pieceLeft - board.x) / cell),
      };
      const next = placeAnimal(state, d.instanceId, anchor);
      if (next === state) triggerShake(d.instanceId);
      else setState(next);
    }
  };

  const handleReset = () => {
    if (state.placed.length === 0) return;
    setConfirmingReset(true);
  };

  const confirmReset = () => {
    setState((s) => resetStage(s));
    setDrag(null);
    setConfirmingReset(false);
  };

  const handleRetry = () => {
    setState(createGameState(stage));
    setDrag(null);
    clearedNotified.current = false;
  };

  const overlayBox = drag ? boundingBox(drag.species) : null;

  return (
    <View style={styles.container} ref={root.ref}>
      <BackButton onPress={onBack} />
      <Text style={styles.title}>{stage.name}</Text>

      {showConditions ? <ConditionsPanel species={uniqueSpecies} /> : null}

      <View style={styles.boardArea}>
        <Board
          state={state}
          cell={cell}
          violatingIds={violatingIds}
          hiddenInstanceId={drag?.kind === 'board' ? drag.instanceId : null}
          shakeInstanceId={shake.id}
          shakeToken={shake.token}
          onPieceDragStart={handlePieceDragStart}
          onPieceDragMove={handleDragMove}
          onPieceDragEnd={handleDragEnd}
          floorRef={boardArea.ref}
          onFloorLayout={boardArea.onLayout}
        />
      </View>

      <View ref={trayArea.ref} onLayout={trayArea.onLayout}>
        <Tray
          tray={state.tray}
          cell={cell}
          hiddenInstanceId={drag?.kind === 'tray' ? drag.instanceId : null}
          shakeInstanceId={shake.id}
          shakeToken={shake.token}
          onChipDragStart={handleChipDragStart}
          onChipDragMove={handleDragMove}
          onChipDragEnd={handleDragEnd}
        />
      </View>

      <StageHud
        remaining={state.tray.length}
        onReset={handleReset}
        showConditions={showConditions}
        onToggleConditions={() => setShowConditions((v) => !v)}
      />

      {cleared ? <ClearOverlay hasNext={hasNext} onNext={onNext} onRetry={handleRetry} onList={onList} /> : null}

      {confirmingReset ? (
        <ConfirmDialog
          title="リセットしますか？"
          message="おいた動物がすべてトレイに戻ります。"
          confirmLabel="リセット"
          onConfirm={confirmReset}
          onCancel={() => setConfirmingReset(false)}
        />
      ) : null}

      {drag && overlayBox && root.rect ? (
        <View
          pointerEvents="none"
          style={[
            styles.dragOverlay,
            {
              left: drag.startX - root.rect.x + drag.dx,
              top: drag.startY - root.rect.y + drag.dy,
              width: overlayBox.w * cell,
              height: overlayBox.h * cell,
            },
          ]}>
          <AnimalPiece species={drag.species} size={{ w: overlayBox.w * cell, h: overlayBox.h * cell }} />
        </View>
      ) : null}
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
  dragOverlay: {
    position: 'absolute',
    zIndex: 50,
    opacity: 0.9,
  },
});
