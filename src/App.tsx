import { useRef } from 'react';

import { createGameState, placeAnimal, posKey, type Stage } from '@/engine';
import { getStage, STAGES } from '@/levels/stages';
import { Board } from '@/ui/Board';

/** 駒を1つ置いた状態も見る（置いても盤面がずれないことの確認用）。 */
const withOnePiece = (stage: Stage) => {
  const empty = createGameState(stage);
  const first = empty.tray[0];
  if (!first) return empty;
  for (let r = 0; r < stage.rows; r++) {
    for (let c = 0; c < stage.cols; c++) {
      const next = placeAnimal(empty, first.instanceId, { r, c });
      if (next !== empty) return next;
    }
  }
  return empty;
};

/** Task 6 の目視確認用。次のタスクで本物の画面に差し替える。 */
export function App() {
  const ref = useRef<HTMLDivElement>(null);
  const wide = getStage('stage-1')!;
  const tall = STAGES.find((s) => s.rows > s.cols)!;
  const square = STAGES.find((s) => s.rows === s.cols && s.rows >= 6)!;
  return (
    <div className="app">
      {[wide, tall, square].map((stage) => (
        <Board
          key={stage.id}
          state={withOnePiece(stage)}
          validAnchors={new Set([posKey({ r: 1, c: 1 })])}
          selectedId={null}
          violatingIds={new Set()}
          gridRef={ref}
        />
      ))}
    </div>
  );
}
