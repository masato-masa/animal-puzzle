import { useEffect, useState } from 'react';

import { STAGES } from '@/levels/stages';
import { navigate } from '@/core/router';
import { isMuted, setMuted, sfx } from '@/core/sfx';
import { speciesSprite } from '@/art/sprites';
import { clearProgress, loadProgress } from '@/storage/progress';

import { SoundIcon } from './icons';

/** タイトルに並べる3匹。真ん中を主役にするので、大きさの違う種を選ぶ。 */
const CAST = ['squirrel', 'lion', 'giraffe'] as const;

export function Home() {
  const [cleared, setCleared] = useState<Set<string> | null>(null);
  const [muted, setMutedState] = useState(isMuted);
  const [confirming, setConfirming] = useState(false);

  const reload = () => {
    void loadProgress().then((p) => setCleared(new Set(p.clearedStageIds)));
  };
  useEffect(reload, []);

  // 進捗を読むまでボタンの文言を決められない（「はじめる」と「つづきから」が
  // 一瞬入れ替わるとちらついて見える）。
  if (!cleared) return <div className="app home" />;

  const clearedCount = STAGES.filter((s) => cleared.has(s.id)).length;
  const started = clearedCount > 0;
  const next = STAGES.find((s) => !cleared.has(s.id)) ?? STAGES[0];

  const toggleMute = () => {
    const v = !muted;
    setMuted(v);
    setMutedState(v);
    if (!v) sfx.select();
  };

  return (
    <div className="app home">
      <button
        type="button"
        className="icon-btn home-sound"
        onClick={toggleMute}
        aria-label={muted ? '音を出す' : '音を消す'}>
        <SoundIcon muted={muted} />
      </button>

      <div className="home-art">
        {CAST.map((sp) => (
          <img key={sp} src={speciesSprite[sp]} alt="" draggable={false} />
        ))}
      </div>

      <h1 className="home-title">動物パズル</h1>
      <p className="home-sub">どうぶつを ぴったり ならべよう</p>

      <div className="home-buttons">
        <button
          type="button"
          className="overlay-btn"
          onClick={() => navigate({ name: 'game', stageId: next.id })}>
          {started ? 'つづきから' : 'はじめる'}
        </button>
        <button
          type="button"
          className="overlay-btn overlay-btn-quiet"
          onClick={() => navigate({ name: 'stages' })}>
          ステージを えらぶ
        </button>
        <button
          type="button"
          className="overlay-btn overlay-btn-quiet"
          onClick={() => navigate({ name: 'my-stages' })}>
          マイステージ
        </button>
      </div>

      <p className="home-progress">
        クリア <strong>{clearedCount}</strong> / {STAGES.length}
      </p>

      {started && (
        <button type="button" className="ghost-btn" onClick={() => setConfirming(true)}>
          きろくを けす
        </button>
      )}

      {confirming && (
        <div className="overlay">
          <div className="overlay-card">
            <h2>きろくを けしますか？</h2>
            <p>クリアした {clearedCount} ステージの記録が消えます</p>
            <div className="overlay-buttons">
              <button
                type="button"
                className="overlay-btn"
                onClick={() => {
                  void clearProgress().then(() => {
                    setConfirming(false);
                    reload();
                  });
                }}>
                けす
              </button>
              <button
                type="button"
                className="overlay-btn overlay-btn-quiet"
                onClick={() => setConfirming(false)}>
                やめる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
