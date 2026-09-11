import { useCallback, useEffect, useState } from 'react';

import { boundingBox, countGeometricPlacements, type Species, type Stage } from '@/engine';
import { goBack, navigate } from '@/core/router';
import { buildSubmissionIssueUrl } from '@/lib/stage-submission';
import { deleteCustomStage, listCustomStages } from '@/storage/custom-stages';

import { BackIcon } from './icons';
import { Piece } from './Piece';

const uniqueSpecies = (stage: Stage): Species[] =>
  Array.from(new Set(stage.animals.map((a) => a.species))).slice(0, 4);

export function MyStages() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [deleting, setDeleting] = useState<Stage | null>(null);

  const reload = useCallback(() => {
    void listCustomStages().then(setStages);
  }, []);

  useEffect(reload, [reload]);

  const confirmDelete = async () => {
    if (!deleting) return;
    await deleteCustomStage(deleting.id);
    setDeleting(null);
    reload();
  };

  const submit = (stage: Stage) => {
    const geometricCount = countGeometricPlacements(stage, 20);
    window.open(buildSubmissionIssueUrl(stage, geometricCount), '_blank', 'noopener');
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-row">
          <div className="header-left">
            <button type="button" className="icon-btn" onClick={goBack} aria-label="もどる">
              <BackIcon />
            </button>
          </div>
          <h1 className="title">マイステージ</h1>
          <div className="header-actions" />
        </div>
        <div className="status-bar" />
      </header>

      <div className="panel">
        {stages.length === 0 ? (
          <p className="empty">まだステージがありません。エディタで作ってみましょう。</p>
        ) : (
          <div className="stage-rows">
            {stages.map((stage) => (
              <div key={stage.id} className="stage-row">
                <button
                  type="button"
                  className="stage-row-main"
                  onClick={() => navigate({ name: 'game', stageId: stage.id })}>
                  <span className="stage-row-thumbs">
                    {uniqueSpecies(stage).map((sp) => {
                      const { w, h } = boundingBox(sp);
                      return (
                        <span key={sp} className="thumb">
                          <Piece species={sp} w={w} h={h} />
                        </span>
                      );
                    })}
                  </span>
                  <span className="stage-row-text">
                    <span className="stage-row-name">{stage.name}</span>
                    <span className="stage-row-meta">
                      {stage.cols}×{stage.rows} ・ 動物 {stage.animals.length}ひき
                    </span>
                  </span>
                </button>
                <button type="button" className="chip-btn" onClick={() => submit(stage)}>
                  投稿
                </button>
                <button type="button" className="chip-btn chip-btn-danger" onClick={() => setDeleting(stage)}>
                  削除
                </button>
              </div>
            ))}
          </div>
        )}

        <button type="button" className="sheet-btn" onClick={() => navigate({ name: 'editor' })}>
          ＋ 新しいステージを作る
        </button>
      </div>

      {deleting && (
        <div className="overlay">
          <div className="overlay-card">
            <h2>削除しますか？</h2>
            <p>{deleting.name}</p>
            <div className="overlay-buttons">
              <button type="button" className="sheet-btn" onClick={() => void confirmDelete()}>
                削除する
              </button>
              <button
                type="button"
                className="sheet-btn quiet"
                onClick={() => setDeleting(null)}>
                やめる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
