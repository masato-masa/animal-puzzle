import { useMemo, useState, type CSSProperties } from 'react';

import {
  boundingBox,
  countGeometricPlacements,
  countSolutions,
  MAX_ANIMALS_PER_STAGE,
  SPECIES,
  validateStage,
  type AnimalInstance,
  type CellTerrain,
  type Species,
  type Stage,
} from '@/engine';
import { speciesLabel } from '@/art/palette';
import { goBack, navigate } from '@/core/router';
import { describeWarning, findDesignWarnings, type DesignWarning } from '@/lib/stage-design-checks';
import { buildSubmissionIssueUrl } from '@/lib/stage-submission';
import { generateCustomStageId, saveCustomStage } from '@/storage/custom-stages';

import { blockSprite } from '@/art/sprites';
import { GAP } from './geometry';
import { BackIcon } from './icons';
import { Piece } from './Piece';

const ALL_SPECIES = Object.keys(SPECIES) as Species[];

const PAINT_OPTIONS: { terrain: CellTerrain; label: string }[] = [
  { terrain: 'land', label: '平地' },
  { terrain: 'wall', label: '茂み' },
  { terrain: 'water', label: '水' },
  { terrain: 'tree', label: '木' },
];

const MIN_SIZE = 5;
const MAX_SIZE = 8;

const makeGrid = (rows: number, cols: number): CellTerrain[][] =>
  Array.from({ length: rows }, () => Array<CellTerrain>(cols).fill('land'));

const buildAnimals = (counts: Record<Species, number>): AnimalInstance[] => {
  const list: AnimalInstance[] = [];
  for (const species of ALL_SPECIES) {
    for (let i = 0; i < counts[species]; i++) list.push({ instanceId: `${species}-${i}`, species });
  }
  return list;
};

const emptyCounts = (): Record<Species, number> =>
  Object.fromEntries(ALL_SPECIES.map((s) => [s, 0])) as Record<Species, number>;

type CheckResult =
  | { kind: 'errors'; errors: string[] }
  | { kind: 'none' }
  | { kind: 'unique'; geometricCount: number; warnings: DesignWarning[] }
  | { kind: 'multiple' };

export function Editor() {
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [terrain, setTerrain] = useState<CellTerrain[][]>(() => makeGrid(5, 5));
  const [paint, setPaint] = useState<CellTerrain>('wall');
  const [counts, setCounts] = useState<Record<Species, number>>(emptyCounts);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const totalAnimals = ALL_SPECIES.reduce((sum, s) => sum + counts[s], 0);

  const stage: Stage = useMemo(
    () => ({ id: 'draft', name: name || '無題のステージ', rows, cols, terrain, animals: buildAnimals(counts) }),
    [name, rows, cols, terrain, counts]
  );

  const resize = (nextRows: number, nextCols: number) => {
    setRows(nextRows);
    setCols(nextCols);
    setTerrain(makeGrid(nextRows, nextCols));
    setResult(null);
  };

  const paintCell = (r: number, c: number) => {
    setTerrain((prev) =>
      prev.map((row, ri) => (ri === r ? row.map((t, ci) => (ci === c ? paint : t)) : row))
    );
    setResult(null);
  };

  const changeCount = (species: Species, delta: number) => {
    setCounts((prev) => ({ ...prev, [species]: Math.max(0, prev[species] + delta) }));
    setResult(null);
  };

  const runCheck = () => {
    const errors = validateStage(stage);
    if (errors.length > 0) return setResult({ kind: 'errors', errors });
    const count = countSolutions(stage, 2);
    if (count === 0) return setResult({ kind: 'none' });
    if (count > 1) return setResult({ kind: 'multiple' });
    setResult({
      kind: 'unique',
      geometricCount: countGeometricPlacements(stage, 20),
      warnings: findDesignWarnings(stage),
    });
  };

  const canSave = result?.kind === 'unique' && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const id = generateCustomStageId();
    await saveCustomStage({ ...stage, id, name: name || '無題のステージ' });
    setSaving(false);
    navigate({ name: 'game', stageId: id });
  };

  const handleSubmit = () => {
    if (result?.kind !== 'unique') return;
    window.open(
      buildSubmissionIssueUrl({ ...stage, name: name || '無題のステージ' }, result.geometricCount),
      '_blank',
      'noopener'
    );
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <button type="button" className="icon-btn" onClick={goBack} aria-label="もどる">
            <BackIcon />
          </button>
        </div>
        <div className="title-block">
          <h1 className="title">ステージエディタ</h1>
        </div>
        <div className="header-right" />
      </header>

      <div className="sheet">
        <section className="field">
          <h2 className="field-label">盤面サイズ</h2>
          <div className="field-row">
            <Stepper label="たて" value={rows} min={MIN_SIZE} max={MAX_SIZE} onChange={(v) => resize(v, cols)} />
            <Stepper label="よこ" value={cols} min={MIN_SIZE} max={MAX_SIZE} onChange={(v) => resize(rows, v)} />
          </div>
        </section>

        <section className="field">
          <h2 className="field-label">地形をえらんでマスをなぞる</h2>
          <div className="field-row">
            {PAINT_OPTIONS.map((opt) => (
              <button
                key={opt.terrain}
                type="button"
                className="chip-btn"
                data-selected={paint === opt.terrain ? 'true' : undefined}
                onClick={() => setPaint(opt.terrain)}>
                {opt.label}
              </button>
            ))}
          </div>
          <PaintGrid rows={rows} cols={cols} terrain={terrain} onPaint={paintCell} />
        </section>

        <section className="field">
          <h2 className="field-label">
            動物をえらぶ（{totalAnimals} / {MAX_ANIMALS_PER_STAGE}）
          </h2>
          {ALL_SPECIES.map((species) => {
            const { w, h } = boundingBox(species);
            return (
              <div key={species} className="animal-row">
                <span className="card-slot" style={{ '--cell': '24px', '--gap': '2px', width: 50 } as CSSProperties}>
                  <Piece species={species} w={w} h={h} dimmed={counts[species] === 0} />
                </span>
                <span className="animal-name">{speciesLabel[species]}</span>
                <Stepper
                  value={counts[species]}
                  min={0}
                  max={MAX_ANIMALS_PER_STAGE}
                  onChange={(v) => changeCount(species, v - counts[species])}
                />
              </div>
            );
          })}
        </section>

        <button type="button" className="overlay-btn" onClick={runCheck}>
          検証する
        </button>

        {result && <ResultView result={result} />}

        <section className="field">
          <h2 className="field-label">ステージ名</h2>
          <input
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="れい: サバンナのしょしんしゃ"
          />
        </section>

        <button
          type="button"
          className="overlay-btn"
          disabled={!canSave}
          onClick={() => void handleSave()}>
          保存してあそぶ
        </button>

        {result?.kind === 'unique' && (
          <button type="button" className="overlay-btn overlay-btn-quiet" onClick={handleSubmit}>
            GitHub に投稿する
          </button>
        )}
      </div>
    </div>
  );
}

/** 地形のペイント。1マスずつのタップでも、なぞっても塗れる。 */
function PaintGrid({
  rows,
  cols,
  terrain,
  onPaint,
}: {
  rows: number;
  cols: number;
  terrain: CellTerrain[][];
  onPaint: (r: number, c: number) => void;
}) {
  const [painting, setPainting] = useState(false);

  const cellFrom = (e: React.PointerEvent): { r: number; c: number } | null => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const r = el?.getAttribute('data-r');
    const c = el?.getAttribute('data-c');
    return r === null || r === undefined || c === null || c === undefined
      ? null
      : { r: Number(r), c: Number(c) };
  };

  return (
    <div
      className="grid editor-grid"
      style={{ '--cols': cols, '--rows': rows, '--gap': `${GAP}px`, '--pad': '0px' } as CSSProperties}
      onPointerDown={(e) => {
        setPainting(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        const pos = cellFrom(e);
        if (pos) onPaint(pos.r, pos.c);
      }}
      onPointerMove={(e) => {
        if (!painting) return;
        const pos = cellFrom(e);
        if (pos) onPaint(pos.r, pos.c);
      }}
      onPointerUp={() => setPainting(false)}
      onPointerCancel={() => setPainting(false)}>
      {terrain.flatMap((row, r) =>
        row.map((t, c) => (
          <div key={`${r},${c}`} className="cell" data-terrain={t} data-r={r} data-c={c}>
            {(t === 'wall' || t === 'tree' || t === 'water') && (
              <img className="cell-art" src={blockSprite[t]} alt="" draggable={false} />
            )}
          </div>
        ))
      )}
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label?: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="stepper">
      {label && <span className="stepper-label">{label}</span>}
      <button
        type="button"
        className="stepper-btn"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        aria-label="へらす">
        −
      </button>
      <span className="stepper-value">{value}</span>
      <button
        type="button"
        className="stepper-btn"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        aria-label="ふやす">
        ＋
      </button>
    </div>
  );
}

function ResultView({ result }: { result: CheckResult }) {
  if (result.kind === 'errors') {
    return (
      <div className="result result-ng">
        {result.errors.map((e, i) => (
          <p key={i}>・{e}</p>
        ))}
      </div>
    );
  }
  if (result.kind === 'none') {
    return <div className="result result-ng">解がありません。配置できない条件になっています。</div>;
  }
  if (result.kind === 'multiple') {
    return (
      <div className="result result-ng">配置パターンが複数あります。茂みなどで絞り込んでください。</div>
    );
  }
  return (
    <div className="result result-ok">
      <p>
        唯一解です！保存できます。（配置パターン {result.geometricCount}
        {result.geometricCount >= 20 ? '+' : ''} 通り中、正解1通り）
      </p>
      {result.geometricCount === 1 && (
        <p className="result-hint">
          ヒント：形だけで置き場所が1通りに決まっています。茂みで仕切って「もっともらしい候補」を増やすと、より考えごたえのあるステージになります。
        </p>
      )}
      {result.warnings.map((w, i) => (
        <p key={i} className="result-hint">
          ヒント：{describeWarning(w)}
        </p>
      ))}
    </div>
  );
}
