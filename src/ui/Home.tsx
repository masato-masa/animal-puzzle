import { AnimatePresence } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';

import { STAGES } from '@/levels/stages';
import { navigate } from '@/core/router';
import { isMuted, setMuted, sfx } from '@/core/sfx';
import { speciesSprite } from '@/art/sprites';
import { loadProgress } from '@/storage/progress';

import { DevSheet, SettingsSheet } from './Sheets';
import { GearIcon } from './icons';

/** タイトルに並べる3匹。真ん中を主役にするので、大きさの違う種を選ぶ。 */
const CAST = ['squirrel', 'lion', 'giraffe'] as const;

type Sheet = 'none' | 'settings' | 'dev';

export function Home() {
  const [cleared, setCleared] = useState<Set<string> | null>(null);
  const [muted, setMutedState] = useState(isMuted);
  const [sheet, setSheet] = useState<Sheet>('none');

  const reload = useCallback(() => {
    void loadProgress().then((p) => setCleared(new Set(p.clearedStageIds)));
  }, []);
  useEffect(reload, [reload]);

  const toggleMute = () => {
    const v = !muted;
    setMuted(v);
    setMutedState(v);
    // 音を戻した合図として 1 音鳴らす。無音のまま戻ると効いたか分からない。
    if (!v) sfx.select();
  };

  // 進捗を読むまでボタンの文言を決められない（「はじめる」と「つづきから」が
  // 一瞬入れ替わるとちらついて見える）。
  if (!cleared) return <div className="app app-home" />;

  const clearedCount = STAGES.filter((s) => cleared.has(s.id)).length;
  const started = clearedCount > 0;
  const next = STAGES.find((s) => !cleared.has(s.id)) ?? STAGES[0];

  return (
    <div className="app app-home">
      <div className="home-top">
        <button
          type="button"
          className="icon-btn"
          onClick={() => setSheet('settings')}
          aria-label="設定">
          <GearIcon />
        </button>
      </div>

      <div className="home">
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
            className="home-btn primary"
            onClick={() => navigate({ name: 'game', stageId: next.id })}>
            {started ? (
              <>
                つづきから
                <span className="home-btn-sub">{next.name}</span>
              </>
            ) : (
              'はじめる'
            )}
          </button>
          <button
            type="button"
            className="home-btn"
            onClick={() => navigate({ name: 'stages' })}>
            ステージを えらぶ
          </button>
        </div>

        <p className="home-progress">
          クリア <strong>{clearedCount}</strong> / {STAGES.length}
        </p>
      </div>

      <button type="button" className="dev-pill" onClick={() => setSheet('dev')}>
        テスト用
      </button>

      <AnimatePresence>
        {sheet === 'settings' && (
          <SettingsSheet
            key="settings"
            muted={muted}
            onToggleMute={toggleMute}
            onClose={() => setSheet('none')}
          />
        )}
        {sheet === 'dev' && (
          <DevSheet key="dev" onChanged={reload} onClose={() => setSheet('none')} />
        )}
      </AnimatePresence>
    </div>
  );
}
