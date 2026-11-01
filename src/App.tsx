import { useCallback, useEffect, useState } from 'react';

import type { Stage } from '@/engine';
import { getNextStage, getStage } from '@/levels/stages';
import { goBack, navigate, useRoute } from '@/core/router';
import { getCustomStage } from '@/storage/custom-stages';
import { milestoneAt } from '@/levels/endless';
import { getEndlessStage, prefetchEndless } from '@/levels/endless-client';
import { recordClear, recordEndlessClear } from '@/storage/progress';

import { Editor } from './ui/Editor';
import { Game } from './ui/Game';
import { Home } from './ui/Home';
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

/**
 * むげんの n 面。盤はワーカーで作るので、出来るまでローディングを出す。
 * 表示したら n+1 面を裏で作らせ、「つぎへ」で待たないようにする。
 */
/** 思考レベルの段が上がる面（節目）でだけ出す一言。それ以外の面では何も足さない。 */
const MILESTONE_TEXT: Record<number, string> = {
  2: 'ここから すこし むずかしく',
  3: 'ここから もっと むずかしく',
  4: 'ここから いちばん むずかしく',
};

function EndlessRoute({ n }: { n: number }) {
  const milestone = milestoneAt(n);
  const [stage, setStage] = useState<{ n: number; stage: Stage } | null>(null);

  useEffect(() => {
    let active = true;
    void getEndlessStage(n).then((s) => {
      if (!active) return;
      setStage({ n, stage: s });
      prefetchEndless(n + 1);
    });
    return () => {
      active = false;
    };
  }, [n]);

  const handleCleared = useCallback(() => {
    void recordEndlessClear(n);
  }, [n]);

  if (!stage || stage.n !== n) {
    return (
      <div className="app notice endless-loading" role="status" aria-live="polite">
        <span className="endless-spinner" aria-hidden="true" />
        <p>むげん {n} めんを つくっています…</p>
      </div>
    );
  }

  return (
    <Game
      key={`endless-${n}`}
      stage={stage.stage}
      title="むげん"
      status={
        <>
          <span className="stat stat-endless">
            <span className="stat-num">{n}</span>
            <span className="stat-label">めん</span>
          </span>
          {milestone && <span className="stat stat-milestone">{MILESTONE_TEXT[milestone]}</span>}
        </>
      }
      hasNext
      nextLabel="つぎへ"
      listLabel="ホーム"
      onBack={() => navigate({ name: 'home' })}
      onNext={() => navigate({ name: 'endless', n: n + 1 })}
      onList={() => navigate({ name: 'home' })}
      onCleared={handleCleared}
    />
  );
}

export function App() {
  const route = useRoute();

  switch (route.name) {
    case 'game':
      return <GameRoute stageId={route.stageId} />;
    case 'endless':
      return <EndlessRoute n={route.n} />;
    case 'stages':
      return <StageSelect />;
    case 'my-stages':
      return <MyStages />;
    case 'editor':
      return <Editor />;
    default:
      return <Home />;
  }
}
