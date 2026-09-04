import type { CellTerrain, Species, Stage } from '@/engine';

const TERRAIN_CODE: Record<CellTerrain, string> = { land: '.', water: '~', tree: 'T', wall: '#', void: 'x' };

const terrainSnippet = (stage: Stage): string =>
  `terrain([${stage.terrain.map((row) => `'${row.map((t) => TERRAIN_CODE[t]).join('')}'`).join(', ')}])`;

const animalCounts = (stage: Stage): [Species, number][] => {
  const counts = new Map<Species, number>();
  for (const a of stage.animals) counts.set(a.species, (counts.get(a.species) ?? 0) + 1);
  return [...counts.entries()];
};

const animalsSnippet = (stage: Stage): string =>
  `animals([${animalCounts(stage).map(([sp, n]) => `['${sp}', ${n}]`).join(', ')}])`;

const rulesSnippet = (stage: Stage): string => {
  if (!stage.rules || stage.rules.length === 0) return '';
  const parts = stage.rules.map((rule) => {
    const fields = Object.entries(rule).map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`);
    return `{ ${fields.join(', ')} }`;
  });
  return `\n    rules: [${parts.join(', ')}],`;
};

/** src/levels/stages.tsのSTAGES配列にそのまま貼り付けられる、1ステージ分のオブジェクトリテラル。 */
export const formatStageSnippet = (stage: Stage, id: string, name: string): string =>
  `  {
    id: '${id}',
    name: '${name}',
    rows: ${stage.rows},
    cols: ${stage.cols},
    terrain: ${terrainSnippet(stage)},
    animals: ${animalsSnippet(stage)},${rulesSnippet(stage)}
  },`;
