import { useCallback, useEffect, useState } from 'react';

import type { Stage } from '@/engine';
import { getNextStage, getStage } from '@/levels/stages';
import { goBack, navigate, useRoute } from '@/core/router';
import { getCustomStage } from '@/storage/custom-stages';
import { recordClear } from '@/storage/progress';

import { Editor } from './ui/Editor';
import { Game } from './ui/Game';
import { MyStages } from './ui/MyStages';
import { StageSelect } from './ui/StageSelect';

/**
 * 出荷ステージは同期で引ける。自作ステージだけ localStorage から読むので
 * 一瞬だけ「読み込み中」を挟む。
 */
function GameRoute({ stageId }: { stageId: string }) {
  const shipped = getStage(stageId);
  const [custom, setCustom] = useState<Stage | null | undefined>(shipped ? null : undefined);

  useEffect(() => {
    if (shipped) return;
    let active = true;
    void getCustomStage(stageId).then((s) => {
      if (active) setCustom(s ?? null);
    });
    return () => {
      active = false;
    };
  }, [stageId, shipped]);

  const handleCleared = useCallback((id: string) => {
    void recordClear(id);
  }, []);

  const stage = shipped ?? custom;
  if (stage === undefined) return <p className="app notice">読み込み中…</p>;
  if (!stage) {
    return (
      <div className="app notice">
        <p>そのステージは見つかりませんでした。</p>
        <button type="button" className="text-btn" onClick={() => navigate({ name: 'stages' })}>
          ステージ一覧へ
        </button>
      </div>
    );
  }

  const next = getNextStage(stage.id);
  return (
    <Game
      key={stage.id}
      stage={stage}
      hasNext={!!next}
      onBack={goBack}
      onNext={() => next && navigate({ name: 'game', stageId: next.id })}
      onList={() => navigate({ name: 'stages' })}
      onCleared={handleCleared}
    />
  );
}

export function App() {
  const route = useRoute();

  switch (route.name) {
    case 'game':
      return <GameRoute stageId={route.stageId} />;
    case 'my-stages':
      return <MyStages />;
    case 'editor':
      return <Editor />;
    default:
      return <StageSelect />;
  }
}
