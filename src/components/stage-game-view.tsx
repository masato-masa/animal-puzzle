import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

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

import { AnimalChip } from './animal-chip';
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

type FloatingPos = { x: number; y: number };

const inRect = (px: number, py: number, rect: { x: number; y: number; w: number; h: number } | null): boolean =>
  !!rect && px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;

/** 画面幅いっぱいから左右パディング分を引いた、盤面エリアに使える横幅の目安。 */
const BOARD_AREA_HORIZONTAL_PADDING = 32;

/** 1ステージの画面全体を統括する。engineへの呼び出しはこのコンポーネントに集約する。 */
export function StageGameView({ stage, hasNext, onCleared, onNext, onBack, onList }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const [state, setState] = useState<GameState>(() => createGameState(stage));
  const [drag, setDrag] = useState<Drag | null>(null);
  const [conditionsExpanded, setConditionsExpanded] = useState(true);
  const [confirmingReset, setConfirmingReset] = useState(false);
  /** トレイにあるが、盤面のマスにもトレイの並びにも収まらず自由な位置に置かれているピース。 */
  const [floating, setFloating] = useState<Record<string, FloatingPos>>({});
  const clearedNotified = useRef(false);

  const content = useMeasuredRect();
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
    // レイアウトが落ち着いてから測る。フォント読み込み等での遅延ずれや、条件パネルの
    // 開閉によるトレイ位置のズレに強くするため少し待つ。
    const t = setTimeout(() => {
      content.measure();
      boardArea.measure();
      trayArea.measure();
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cell, stage.id, conditionsExpanded]);

  const setFloatingPosition = (instanceId: string, pageLeft: number, pageTop: number) => {
    const origin = content.rect;
    if (!origin) return;
    setFloating((f) => ({ ...f, [instanceId]: { x: pageLeft - origin.x, y: pageTop - origin.y } }));
  };

  const clearFloating = (instanceId: string) => {
    setFloating((f) => {
      if (!(instanceId in f)) return f;
      const next = { ...f };
      delete next[instanceId];
      return next;
    });
  };

  const handlePieceDragStart = (instanceId: string, species: Species, anchor: Pos, pageX: number, pageY: number) => {
    content.measure();
    boardArea.measure();
    trayArea.measure();
    setDrag({ kind: 'board', instanceId, species, originAnchor: anchor, startX: pageX, startY: pageY, dx: 0, dy: 0 });
  };

  const handleChipDragStart = (instanceId: string, species: Species, pageX: number, pageY: number) => {
    content.measure();
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
    const pieceLeft = d.startX + dx;
    const pieceTop = d.startY + dy;
    const box = boundingBox(d.species);
    const pieceCenterX = pieceLeft + (box.w * cell) / 2;
    const pieceCenterY = pieceTop + (box.h * cell) / 2;

    const board = boardArea.rect;
    const overTray = inRect(pieceCenterX, pieceCenterY, trayArea.rect);
    const overBoard = inRect(pieceCenterX, pieceCenterY, board);

    if (overTray) {
      if (d.kind === 'board') setState((s) => returnToTray(s, d.instanceId));
      clearFloating(d.instanceId);
      return;
    }

    if (overBoard && board) {
      const anchor: Pos = {
        r: Math.round((pieceTop - board.y) / cell),
        c: Math.round((pieceLeft - board.x) / cell),
      };
      const next = (d.kind === 'board' ? moveAnimal : placeAnimal)(state, d.instanceId, anchor);
      if (next !== state) {
        setState(next);
        clearFloating(d.instanceId);
        return;
      }
    }

    // マスにぴったりはまらなかった場合は、指を離したその場所に自由に置く（茂みの上なども可）。
    if (d.kind === 'board') setState((s) => returnToTray(s, d.instanceId));
    setFloatingPosition(d.instanceId, pieceLeft, pieceTop);
  };

  const handleReset = () => {
    if (state.placed.length === 0 && Object.keys(floating).length === 0) return;
    setConfirmingReset(true);
  };

  const confirmReset = () => {
    setState((s) => resetStage(s));
    setFloating({});
    setDrag(null);
    setConfirmingReset(false);
  };

  const handleRetry = () => {
    setState(createGameState(stage));
    setFloating({});
    setDrag(null);
    clearedNotified.current = false;
  };

  const overlayBox = drag ? boundingBox(drag.species) : null;
  const strayTray = state.tray.filter((a) => !(a.instanceId in floating));

  return (
    <View style={styles.screen}>
      <BackButton onPress={onBack} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content} ref={content.ref} onLayout={content.onLayout}>
          <Text style={styles.title}>{stage.name}</Text>

          <View style={styles.boardArea}>
            <Board
              state={state}
              cell={cell}
              violatingIds={violatingIds}
              hiddenInstanceId={drag?.kind === 'board' ? drag.instanceId : null}
              onPieceDragStart={handlePieceDragStart}
              onPieceDragMove={handleDragMove}
              onPieceDragEnd={handleDragEnd}
              floorRef={boardArea.ref}
              onFloorLayout={boardArea.onLayout}
            />
          </View>

          <ConditionsPanel
            species={uniqueSpecies}
            expanded={conditionsExpanded}
            onToggleExpanded={() => setConditionsExpanded((v) => !v)}
          />

          <View ref={trayArea.ref} onLayout={trayArea.onLayout} style={styles.trayWrap}>
            <Tray
              tray={strayTray}
              cell={cell}
              hiddenInstanceId={drag?.kind === 'tray' ? drag.instanceId : null}
              onChipDragStart={handleChipDragStart}
              onChipDragMove={handleDragMove}
              onChipDragEnd={handleDragEnd}
            />
          </View>

          <StageHud remaining={state.tray.length} onReset={handleReset} />

          {Object.entries(floating).map(([instanceId, pos]) => {
            const animal = state.tray.find((a) => a.instanceId === instanceId);
            if (!animal) return null;
            return (
              <View key={instanceId} style={[styles.floatingSlot, { left: pos.x, top: pos.y }]}>
                <AnimalChip
                  species={animal.species}
                  cell={cell}
                  hidden={drag?.kind === 'tray' && drag.instanceId === instanceId}
                  onDragStart={(pageX, pageY) => handleChipDragStart(instanceId, animal.species, pageX, pageY)}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                />
              </View>
            );
          })}

          {drag && overlayBox && content.rect ? (
            <View
              pointerEvents="none"
              style={[
                styles.dragOverlay,
                {
                  left: drag.startX - content.rect.x + drag.dx,
                  top: drag.startY - content.rect.y + drag.dy,
                  width: overlayBox.w * cell,
                  height: overlayBox.h * cell,
                },
              ]}>
              <AnimalPiece species={drag.species} size={{ w: overlayBox.w * cell, h: overlayBox.h * cell }} />
            </View>
          ) : null}
        </View>
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.skyBottom,
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
    position: 'relative',
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
  trayWrap: {
    width: '100%',
  },
  floatingSlot: {
    position: 'absolute',
    zIndex: 5,
  },
  dragOverlay: {
    position: 'absolute',
    zIndex: 50,
    opacity: 0.9,
  },
});
