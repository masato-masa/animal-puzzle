import { useEffect, useMemo, useRef, useState } from 'react';

import {
  animalAt,
  createGameState,
  isStageCleared,
  moveAnimal,
  placeAnimal,
  returnToTray,
  validAnchorCells,
  violatingAnimals,
  type Pos,
  type Stage,
} from '@/engine';
import { sfx, isMuted, setMuted, vibrate } from '@/core/sfx';

import { AnimalCards } from './AnimalCards';
import { Board } from './Board';
import { BackIcon, ListIcon, ResetIcon, SoundIcon } from './icons';

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
  const gridRef = useRef<HTMLDivElement>(null);

  // ステージが変わったら作り直す。同じコンポーネントが使い回されるため。
  useEffect(() => {
    setState(createGameState(stage));
    setSelectedId(null);
    setRejectToken(0);
  }, [stage]);

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
          gridRef={gridRef}
          rejectToken={rejectToken}
          onCellPress={handleCellPress}
          onPiecePress={handlePiecePress}
        />

        {selectedOnBoard && (
          <button type="button" className="return-btn" onClick={handleReturn}>
            この動物をもどす
          </button>
        )}

        <AnimalCards state={state} selectedId={selectedId} onSelect={handleSelectFromCard} />
      </div>

      {cleared && (
        <div className="temp-clear">
          クリア！
          {hasNext && (
            <button type="button" onClick={onNext}>
              つぎへ
            </button>
          )}
        </div>
      )}
    </div>
  );
}
