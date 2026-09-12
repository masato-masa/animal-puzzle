import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence } from 'motion/react';

import {
  boundingBox,
  createGameState,
  isStageCleared,
  moveAnimal,
  placeAnimal,
  returnToTray,
  validAnchorCells,
  violatingAnimals,
  type Species,
  type Stage,
} from '@/engine';
import { isMuted, setMuted, sfx, vibrate } from '@/core/sfx';

import { AnimalCards } from './AnimalCards';
import { Board, BOUNCE_STEP, type FreePositions } from './Board';
import { ClearOverlay } from './ClearOverlay';
import { anchorFromPiecePoint, cellSize, GAP } from './geometry';
import { BackIcon, GearIcon, HelpIcon, ResetToolIcon } from './icons';
import { Piece } from './Piece';
import { HelpSheet, SettingsSheet } from './Sheets';

/** ドラッグ中の駒。left/top はつかんだ瞬間の駒の左上（画面座標）。 */
type Drag = { instanceId: string; species: Species; left: number; top: number; dx: number; dy: number };

/**
 * 駒の左上が、いちばん近いマスの正しい位置からこの割合（セル1辺に対する比）
 * より近ければ、そのマスに吸着させる。離れていればその場に置いたままにする。
 *
 * 0.5 を超えると「隣のマスの領域」に入るので、それより小さくする。
 * 小さくしすぎると狙って置いてもはまらず、大きくしすぎると
 * 「マスとマスの間に置いたつもり」が勝手にはまってしまう。
 */
const SNAP_RATIO = 0.38;

export type GameProps = {
  stage: Stage;
  /** 次のステージがあるか。クリア画面のボタンの出し分けに使う。 */
  hasNext: boolean;
  onBack: () => void;
  onNext: () => void;
  onList: () => void;
  onCleared: (stageId: string) => void;
};

/**
 * 1ステージの統括。engine への呼び出しはこのファイルに集約し、Board は座標と
 * 描画だけを持つ。「置けるかどうか」を UI 側で判定しない — placeAnimal /
 * moveAnimal が状態を変えたかどうかだけで判断する（engine と二重管理しない）。
 */
export function Game({ stage, hasNext, onBack, onNext, onList, onCleared }: GameProps) {
  const [state, setState] = useState(() => createGameState(stage));
  const [drag, setDrag] = useState<Drag | null>(null);
  /**
   * 盤の上に自由に置かれている駒。マスにはまっていないので engine の
   * placed ではなく tray に居る。座標は .grid の左上を原点とした px。
   */
  const [free, setFree] = useState<FreePositions>({});
  /** 盤面の1マスの辺長。カードからつかんだ駒を盤面と同じ大きさで追従させるのに使う。 */
  const [boardCell, setBoardCell] = useState(40);
  const [sheet, setSheet] = useState<'none' | 'help' | 'settings'>('none');
  const [muted, setMutedState] = useState(isMuted);
  const gridRef = useRef<HTMLDivElement>(null);

  // ステージが変わったら作り直す。同じコンポーネントが使い回されるため。
  useEffect(() => {
    setState(createGameState(stage));
    setFree({});
    setDrag(null);
  }, [stage]);

  // 盤面の実寸を測る。CSS が min() で決めるので、JS 側からは読むだけにする。
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => setBoardCell(cellSize(el.getBoundingClientRect(), stage.cols));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stage.cols]);

  const violatingIds = useMemo(
    () => new Set(violatingAnimals(state).map((a) => a.instanceId)),
    [state]
  );
  const cleared = isStageCleared(state);

  /**
   * ドラッグ中の駒が実際に置けるアンカー。つかんでいる間だけ光らせる。
   * 盤上の駒なら、いったんトレイに戻した状態で聞く（自分自身との重なりで
   * 置き先が全部ふさがってしまうため）。
   */
  const draggingId = drag?.instanceId ?? null;
  const validAnchors = useMemo(() => {
    if (!draggingId) return new Set<string>();
    const onBoard = state.placed.some((p) => p.instanceId === draggingId);
    return validAnchorCells(onBoard ? returnToTray(state, draggingId) : state, draggingId);
  }, [draggingId, state]);

  useEffect(() => {
    if (!cleared) return;
    onCleared(stage.id);
    sfx.clear();
    vibrate([18, 60, 18, 60, 30]);
  }, [cleared, stage.id, onCleared]);

  const speciesOf = (instanceId: string): Species | undefined =>
    stage.animals.find((a) => a.instanceId === instanceId)?.species;

  const dropFree = (instanceId: string) =>
    setFree((f) => {
      if (!(instanceId in f)) return f;
      const next = { ...f };
      delete next[instanceId];
      return next;
    });

  const handleDragStart = (instanceId: string, left: number, top: number) => {
    const species = speciesOf(instanceId);
    if (!species) return;
    setDrag({ instanceId, species, left, top, dx: 0, dy: 0 });
  };

  const handleDragMove = (dx: number, dy: number) => {
    setDrag((d) => (d ? { ...d, dx, dy } : d));
  };

  const handleDragEnd = () => {
    const d = drag;
    setDrag(null);
    if (!d) return;

    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cell = cellSize(rect, stage.cols);
    const { w, h } = boundingBox(d.species);
    const left = d.left + d.dx;
    const top = d.top + d.dy;
    const centerX = left + (w * cell + (w - 1) * GAP) / 2;
    const centerY = top + (h * cell + (h - 1) * GAP) / 2;

    const insideBoard =
      centerX >= rect.left &&
      centerX <= rect.left + rect.width &&
      centerY >= rect.top &&
      centerY <= rect.top + rect.height;

    // 盤の外で離した ＝ 動物リストへ返す。
    if (!insideBoard) {
      setState(returnToTray(state, d.instanceId));
      dropFree(d.instanceId);
      sfx.lift();
      return;
    }

    // いちばん近いマスに、ぴったり近ければ吸着させる。
    const anchor = anchorFromPiecePoint(rect, left, top, stage.cols);
    const step = cell + GAP;
    const offset = Math.hypot(left - (rect.left + anchor.c * step), top - (rect.top + anchor.r * step));
    const onBoard = state.placed.some((p) => p.instanceId === d.instanceId);
    const snapped = (onBoard ? moveAnimal : placeAnimal)(state, d.instanceId, anchor);

    if (snapped !== state && offset <= cell * SNAP_RATIO) {
      setState(snapped);
      dropFree(d.instanceId);
      sfx.place();
      vibrate(8);
      return;
    }

    // はまらなかった（置けないマス、またはマスとマスの間）。
    // 弾かずに、離したその場所へそのまま置く。
    setState(returnToTray(state, d.instanceId));
    setFree((f) => ({ ...f, [d.instanceId]: { x: left - rect.left, y: top - rect.top } }));
    sfx.lift();
  };

  const handleReset = () => {
    setState(createGameState(stage));
    setFree({});
    setDrag(null);
  };

  const toggleMute = () => {
    const v = !muted;
    setMuted(v);
    setMutedState(v);
    if (!v) sfx.select();
  };

  const placedCount = state.placed.length;
  const total = stage.animals.length;

  return (
    <div className="app app-game">
      {/* 行 1 はナビゲーションだけ。置いた数は必ず行 2 に置く。 */}
      <header className="header">
        <div className="header-row">
          <div className="header-left">
            <button type="button" className="icon-btn" onClick={onBack} aria-label="もどる">
              <BackIcon />
            </button>
          </div>

          <h1 className="title">{stage.name}</h1>

          {/* 並びは ? が左、設定が右。4 つのゲームで同じにしてある。 */}
          <div className="header-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSheet('help')}
              aria-label="遊びかた">
              <HelpIcon />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSheet('settings')}
              aria-label="設定">
              <GearIcon />
            </button>
          </div>
        </div>

        <div className="status-bar">
          <span className="stat">
            <span className="stat-label">おいた</span>
            <span className="stat-num stat-now">{placedCount}</span>
            <span className="stat-slash">/</span>
            <span className="stat-num stat-total">{total}</span>
          </span>
        </div>
      </header>

      {/* 盤面とカードは、ヘッダーの下に残った高さの中央に置く。 */}
      <div className="play">
        <Board
          state={state}
          validAnchors={validAnchors}
          violatingIds={violatingIds}
          draggingId={draggingId}
          free={free}
          gridRef={gridRef}
          won={cleared}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />

        <AnimalCards
          state={state}
          free={free}
          draggingId={draggingId}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          boardCell={boardCell}
        />

        {/* 操作のボタンはどのゲームでも盤面の下に置く。 */}
        <footer className="footer">
          <button type="button" className="tool" onClick={handleReset} aria-label="やり直す">
            <ResetToolIcon />
          </button>
        </footer>
      </div>

      {/* 指に追従する駒。画面全体を覆う固定レイヤーに描くので、
          盤面やカードのレイアウトには一切影響しない。 */}
      {drag && (
        <div
          className="drag-layer"
          style={
            {
              '--cell': `${boardCell}px`,
              '--gap': `${GAP}px`,
              left: drag.left + drag.dx,
              top: drag.top + drag.dy,
            } as CSSProperties
          }>
          <Piece
            species={drag.species}
            w={boundingBox(drag.species).w}
            h={boundingBox(drag.species).h}
          />
        </div>
      )}

      <AnimatePresence>
        {sheet === 'help' && <HelpSheet key="help" onClose={() => setSheet('none')} />}
        {sheet === 'settings' && (
          <SettingsSheet
            key="settings"
            muted={muted}
            onToggleMute={toggleMute}
            onClose={() => setSheet('none')}
          />
        )}
      </AnimatePresence>

      {cleared && (
        <ClearOverlay
          // 駒が全部跳ね終わってから出す。
          delay={state.placed.length * BOUNCE_STEP + 0.42}
          hasNext={hasNext}
          onNext={onNext}
          onRetry={handleReset}
          onList={onList}
        />
      )}
    </div>
  );
}
