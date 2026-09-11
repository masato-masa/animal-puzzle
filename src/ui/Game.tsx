import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import {
  animalAt,
  boundingBox,
  createGameState,
  isStageCleared,
  moveAnimal,
  placeAnimal,
  returnToTray,
  validAnchorCells,
  violatingAnimals,
  type Pos,
  type Species,
  type Stage,
} from '@/engine';
import { sfx, isMuted, setMuted, vibrate } from '@/core/sfx';

import { AnimalCards } from './AnimalCards';
import { Board, BOUNCE_STEP } from './Board';
import { ClearOverlay } from './ClearOverlay';
import { anchorFromPiecePoint, cellSize, GAP } from './geometry';
import { BackIcon, ListIcon, ResetIcon, SoundIcon } from './icons';
import { Piece } from './Piece';

/** ドラッグ中の駒。left/top はつかんだ瞬間の駒の左上（画面座標）。 */
type Drag = { instanceId: string; species: Species; left: number; top: number; dx: number; dy: number };

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectToken, setRejectToken] = useState(0);
  const [muted, setMutedState] = useState(isMuted);
  const [drag, setDrag] = useState<Drag | null>(null);
  /** 盤面の1マスの辺長。カードからつかんだ駒を盤面と同じ大きさで追従させるのに使う。 */
  const [boardCell, setBoardCell] = useState(40);
  const gridRef = useRef<HTMLDivElement>(null);

  // ステージが変わったら作り直す。同じコンポーネントが使い回されるため。
  useEffect(() => {
    setState(createGameState(stage));
    setSelectedId(null);
    setRejectToken(0);
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
   * 選択中の駒が実際に置けるアンカー。盤上の駒を選んでいる場合は、いったん
   * トレイに戻した状態で聞く（自分自身との重なりで全部ふさがってしまうため）。
   */
  const validAnchors = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const onBoard = state.placed.some((p) => p.instanceId === selectedId);
    return validAnchorCells(onBoard ? returnToTray(state, selectedId) : state, selectedId);
  }, [selectedId, state]);

  useEffect(() => {
    if (!cleared) return;
    onCleared(stage.id);
    sfx.clear();
    vibrate([18, 60, 18, 60, 30]);
  }, [cleared, stage.id, onCleared]);

  const tryPlace = (anchor: Pos) => {
    if (!selectedId) return;
    const onBoard = state.placed.some((p) => p.instanceId === selectedId);
    const next = (onBoard ? moveAnimal : placeAnimal)(state, selectedId, anchor);
    if (next === state) {
      setRejectToken((t) => t + 1);
      sfx.reject();
      vibrate([12, 40, 12]);
      return;
    }
    setState(next);
    setSelectedId(null);
    sfx.place();
    vibrate(8);
  };

  const handleCellPress = (pos: Pos) => {
    if (selectedId) {
      tryPlace(pos);
      return;
    }
    // 何も選んでいないときにマスを押したら、そこにある駒を選ぶ。
    const here = animalAt(state, pos);
    if (here) {
      setSelectedId(here.instanceId);
      sfx.select();
    }
  };

  const handlePiecePress = (instanceId: string) => {
    if (selectedId === instanceId) {
      setSelectedId(null);
      return;
    }
    if (selectedId) {
      // 別の駒を選んだ状態でこの駒を押した ＝ そこへ置こうとしている。
      const target = state.placed.find((p) => p.instanceId === instanceId);
      if (target) tryPlace(target.anchor);
      return;
    }
    setSelectedId(instanceId);
    sfx.select();
  };

  const handleSelectFromCard = (instanceId: string) => {
    setSelectedId((cur) => (cur === instanceId ? null : instanceId));
    sfx.select();
  };

  const speciesOf = (instanceId: string): Species | undefined =>
    stage.animals.find((a) => a.instanceId === instanceId)?.species;

  const handleDragStart = (instanceId: string, left: number, top: number) => {
    const species = speciesOf(instanceId);
    if (!species) return;
    setDrag({ instanceId, species, left, top, dx: 0, dy: 0 });
    setSelectedId(instanceId);
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

    if (insideBoard) {
      // アンカーの算出も置けるかの判定も、既存の経路にそのまま流す。
      const onBoard = state.placed.some((p) => p.instanceId === d.instanceId);
      const anchor = anchorFromPiecePoint(rect, left, top, stage.cols);
      const next = (onBoard ? moveAnimal : placeAnimal)(state, d.instanceId, anchor);
      if (next === state) {
        setRejectToken((t) => t + 1);
        sfx.reject();
        vibrate([12, 40, 12]);
        return;
      }
      setState(next);
      setSelectedId(null);
      sfx.place();
      vibrate(8);
      return;
    }

    // 盤の外で離した。盤上の駒ならトレイに戻す。
    const back = returnToTray(state, d.instanceId);
    if (back !== state) {
      setState(back);
      sfx.lift();
    }
    setSelectedId(null);
  };

  const handleReturn = () => {
    if (!selectedId) return;
    const next = returnToTray(state, selectedId);
    if (next === state) return;
    setState(next);
    setSelectedId(null);
    sfx.lift();
  };

  const handleReset = () => {
    setState(createGameState(stage));
    setSelectedId(null);
    setRejectToken(0);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) sfx.select();
  };

  const placedCount = state.placed.length;
  const total = stage.animals.length;
  const selectedOnBoard = selectedId !== null && state.placed.some((p) => p.instanceId === selectedId);

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <button type="button" className="icon-btn" onClick={onBack} aria-label="もどる">
            <BackIcon />
          </button>
        </div>

        <div className="title-block">
          <h1 className="title">{stage.name}</h1>
          <p className="progress">
            <span className="progress-now">{placedCount}</span>
            <span className="progress-slash">/</span>
            <span className="progress-total">{total}</span>
          </p>
        </div>

        <div className="header-right">
          <button type="button" className="icon-btn" onClick={handleReset} aria-label="やり直す">
            <ResetIcon />
          </button>
          <button type="button" className="icon-btn" onClick={onList} aria-label="ステージ一覧">
            <ListIcon />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={toggleMute}
            aria-label={muted ? '音を出す' : '音を消す'}>
            <SoundIcon muted={muted} />
          </button>
        </div>
      </header>

      {/* 盤面とカードは、ヘッダーの下に残った高さの中央に置く。 */}
      <div className="play">
        <Board
          state={state}
          validAnchors={validAnchors}
          selectedId={selectedId}
          violatingIds={violatingIds}
          draggingId={drag?.instanceId ?? null}
          gridRef={gridRef}
          rejectToken={rejectToken}
          won={cleared}
          onCellPress={handleCellPress}
          onPiecePress={handlePiecePress}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />

        {selectedOnBoard && !drag && (
          <button type="button" className="return-btn" onClick={handleReturn}>
            この動物をもどす
          </button>
        )}

        <AnimalCards
          state={state}
          selectedId={selectedId}
          draggingId={drag?.instanceId ?? null}
          onSelect={handleSelectFromCard}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          boardCell={boardCell}
        />
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
