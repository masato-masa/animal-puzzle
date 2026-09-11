import { useEffect, useState } from 'react';

import { CHAPTERS, getStage, STAGES } from '@/levels/stages';
import { goBack, navigate } from '@/core/router';
import { loadProgress } from '@/storage/progress';

import { BackIcon } from './icons';

/** 章ごとに番号タイルを並べる。40面を縦に並べるとスクロールが長すぎるため。 */
export function StageSelect() {
  const [cleared, setCleared] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    void loadProgress().then((p) => {
      if (active) setCleared(new Set(p.clearedStageIds));
    });
    return () => {
      active = false;
    };
  }, []);

  const clearedCount = STAGES.filter((s) => cleared.has(s.id)).length;

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <button type="button" className="icon-btn" onClick={goBack} aria-label="もどる">
            <BackIcon />
          </button>
        </div>
        <div className="title-block">
          <h1 className="title">動物パズル</h1>
          <p className="progress">
            <span className="progress-now">{clearedCount}</span>
            <span className="progress-slash">/</span>
            <span className="progress-total">{STAGES.length}</span>
          </p>
        </div>
        <div className="header-right" />
      </header>

      <div className="sheet">
        {CHAPTERS.map((chapter) => {
          const done = chapter.stageIds.filter((id) => cleared.has(id)).length;
          return (
            <section key={chapter.id} className="chapter">
              <h2 className="chapter-head">
                <span>{chapter.name}</span>
                <span className="chapter-count">
                  {done}/{chapter.stageIds.length}
                </span>
              </h2>
              <div className="tiles">
                {chapter.stageIds.map((id, i) => {
                  const stage = getStage(id);
                  if (!stage) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      className="tile"
                      data-cleared={cleared.has(id) ? 'true' : undefined}
                      title={stage.name}
                      onClick={() => navigate({ name: 'game', stageId: id })}>
                      {STAGES.findIndex((s) => s.id === id) + 1 || i + 1}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

    </div>
  );
}
