import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import {
  boundingBox,
  createGameState,
  isStageCleared,
  moveAnimal,
  placeAnimal,
  returnToTray,
  violatingAnimals,
  type AnimalInstance,
  type GameState,
  type Pos,
  type Species,
  type Stage,
} from '@/engine';
import { colors, ui } from '@/theme';

import { AnimalPiece } from './animal-piece';
import { Board } from './board';
import { ClearOverlay } from './clear-overlay';
import { ConditionsPanel } from './conditions-panel';
import { useMeasuredRect } from './draggable';
import { Tray } from './tray';

const grassBg = require('@/assets/images/terrain/grass-bg.png');

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

type TrayPos = { x: number; y: number };

const inRect = (px: number, py: number, rect: { x: number; y: number; w: number; h: number } | null): boolean =>
  !!rect && px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;

/** 画面幅いっぱいから左右パディング分を引いた、盤面エリアに使える横幅の目安。 */
const BOARD_AREA_HORIZONTAL_PADDING = 32;
const MIN_CELL = 18;
const MAX_CELL = 64;
const TRAY_PIECE_MARGIN = 8;
/** 盤面・トレイ以外に見積もる固定の縦スペース（上部バー・余白等）。じょうけんは重ねて開くので含めない。 */
const FIXED_CHROME_HEIGHT = 150;

/** トレイの各ピースの初期位置を、折り返しのある単純なグリッドとして一度だけ計算する。 */
const packTray = (
  animals: AnimalInstance[],
  cell: number,
  zoneWidth: number
): { positions: Record<string, TrayPos>; height: number } => {
  const positions: Record<string, TrayPos> = {};
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  for (const a of animals) {
    const { w, h } = boundingBox(a.species);
    const pw = w * cell;
    const ph = h * cell;
    if (x > 0 && x + pw > zoneWidth) {
      x = 0;
      y += rowHeight + TRAY_PIECE_MARGIN;
      rowHeight = 0;
    }
    positions[a.instanceId] = { x, y };
    x += pw + TRAY_PIECE_MARGIN;
    rowHeight = Math.max(rowHeight, ph);
  }
  return { positions, height: animals.length === 0 ? 0 : y + rowHeight };
};

/** 縦スクロールなしで収まるよう、横幅だけでなく画面の高さからもセルサイズを決める。柵の太さ分も見込む。 */
const fitCell = (stage: Stage, windowWidth: number, windowHeight: number): number => {
  const availableWidth = Math.min(windowWidth - BOARD_AREA_HORIZONTAL_PADDING, 520);
  // 柵の太さ（左右あわせてセル約1.4個分）も横幅に収まるよう見込んでおく。
  let cell = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(availableWidth / (stage.cols + 1.4))));

  while (cell > MIN_CELL) {
    const fenceThickness = Math.round(cell * 0.7);
    const boardHeight = stage.rows * cell + fenceThickness * 2;
    const trayHeight = packTray(stage.animals, cell, cell * stage.cols).height;
    if (FIXED_CHROME_HEIGHT + boardHeight + trayHeight <= windowHeight) break;
    cell -= 1;
  }
  return cell;
};

/** 1ステージの画面全体を統括する。engineへの呼び出しはこのコンポーネントに集約する。 */
export function StageGameView({ stage, hasNext, onCleared, onNext, onBack, onList }: Props) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [state, setState] = useState<GameState>(() => createGameState(stage));
  const [drag, setDrag] = useState<Drag | null>(null);
  const [conditionsExpanded, setConditionsExpanded] = useState(false);
  const clearedNotified = useRef(false);

  const cell = fitCell(stage, windowWidth, windowHeight);
  const trayZoneWidth = cell * stage.cols;
  const trayLayout = packTray(stage.animals, cell, trayZoneWidth);

  /**
   * ドラッグでユーザーが動かしたピースの位置（トレイ枠基準）。まだ動かしていないピースは
   * trayLayout.positionsの初期グリッド位置を使う。cellはウィンドウサイズから毎レンダー
   * 計算し直すため、初回マウント時のuseState初期値としてtrayLayoutを固定してしまうと、
   * 初回のcellがまだ安定していない場合にズレたまま固まってしまう。そのため「動かした
   * ピースだけ上書きする差分」として持ち、動かしていないピースは常に最新のcellで
   * 計算されたデフォルト位置を使うようにする。
   */
  const [customPositions, setCustomPositions] = useState<Record<string, TrayPos>>({});
  const positions: Record<string, TrayPos> = { ...trayLayout.positions, ...customPositions };

  const content = useMeasuredRect();
  const boardArea = useMeasuredRect();
  const trayArea = useMeasuredRect();

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
      content.measure();
      boardArea.measure();
      trayArea.measure();
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cell, stage.id]);

  const setPiecePosition = (instanceId: string, pageLeft: number, pageTop: number) => {
    const origin = trayArea.rect;
    if (!origin) return;
    setCustomPositions((p) => ({ ...p, [instanceId]: { x: pageLeft - origin.x, y: pageTop - origin.y } }));
  };

  const clearPosition = (instanceId: string) => {
    setCustomPositions((p) => {
      if (!(instanceId in p)) return p;
      const next = { ...p };
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
    if (board && inRect(pieceCenterX, pieceCenterY, board)) {
      const anchor: Pos = {
        r: Math.round((pieceTop - board.y) / cell),
        c: Math.round((pieceLeft - board.x) / cell),
      };
      const next = (d.kind === 'board' ? moveAnimal : placeAnimal)(state, d.instanceId, anchor);
      if (next !== state) {
        setState(next);
        clearPosition(d.instanceId);
        return;
      }
    }

    // 有効なマスにぴったりはまらなかった場合は、指を離したその場所に自由に置く（トレイの外・茂みの上なども可）。
    if (d.kind === 'board') setState((s) => returnToTray(s, d.instanceId));
    setPiecePosition(d.instanceId, pieceLeft, pieceTop);
  };

  const handleRetry = () => {
    setState(createGameState(stage));
    setCustomPositions({});
    setDrag(null);
    clearedNotified.current = false;
  };

  const overlayBox = drag ? boundingBox(drag.species) : null;

  return (
    <View style={styles.screen}>
      <Image
        source={grassBg}
        resizeMode="cover"
        style={[styles.screenBg, { width: windowWidth, height: windowHeight }]}
      />

      <View style={styles.content} ref={content.ref} onLayout={content.onLayout}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} hitSlop={8} style={styles.iconBtn}>
            <Text style={styles.iconText}>←</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {stage.name}
          </Text>
          <Pressable onPress={() => setConditionsExpanded((v) => !v)} hitSlop={8} style={styles.iconBtn}>
            <Text style={styles.iconText}>{conditionsExpanded ? '▲' : '▼'}</Text>
          </Pressable>

          {conditionsExpanded ? (
            <View style={styles.conditionsDropdown}>
              <ConditionsPanel species={uniqueSpecies} />
            </View>
          ) : null}
        </View>

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

        <View ref={trayArea.ref} onLayout={trayArea.onLayout}>
          <Tray
            tray={state.tray}
            cell={cell}
            positions={positions}
            size={{ width: trayZoneWidth, height: trayLayout.height }}
            hiddenInstanceId={drag?.kind === 'tray' ? drag.instanceId : null}
            onChipDragStart={handleChipDragStart}
            onChipDragMove={handleDragMove}
            onChipDragEnd={handleDragEnd}
          />
        </View>

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

      {cleared ? <ClearOverlay hasNext={hasNext} onNext={onNext} onRetry={handleRetry} onList={onList} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.skyBottom,
  },
  screenBg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    position: 'relative',
  },
  topBar: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 20,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.panelBorder,
    ...ui.shadow,
  },
  iconText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  conditionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    zIndex: 30,
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
