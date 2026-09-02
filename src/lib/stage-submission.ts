import type { CellTerrain, Species, Stage } from '@/engine';

const REPO_URL = 'https://github.com/masato-masa/animal-puzzle';

const TERRAIN_CODE: Record<CellTerrain, string> = { land: '.', water: '~', sky: '^', wall: '#', void: 'x' };

const terrainSnippet = (stage: Stage): string =>
  stage.terrain.map((row) => `    '${row.map((t) => TERRAIN_CODE[t]).join('')}',`).join('\n');

const animalCounts = (stage: Stage): [Species, number][] => {
  const counts = new Map<Species, number>();
  for (const a of stage.animals) counts.set(a.species, (counts.get(a.species) ?? 0) + 1);
  return [...counts.entries()];
};

const animalsSnippet = (stage: Stage): string =>
  animalCounts(stage)
    .map(([species, n]) => `    ['${species}', ${n}],`)
    .join('\n');

/** stages.ts にそのまま貼り付けられる形式のコード片。投稿Issueの本文に埋め込む。 */
export const buildStageCodeSnippet = (stage: Stage): string =>
  [
    '{',
    `  id: 'stage-xx',`,
    `  name: '${stage.name}',`,
    `  rows: ${stage.rows},`,
    `  cols: ${stage.cols},`,
    '  terrain: terrain([',
    terrainSnippet(stage),
    '  ]),',
    '  animals: animals([',
    animalsSnippet(stage),
    '  ]),',
    '},',
  ].join('\n');

/** GitHub Issueの下書き作成画面を開くURL。実際に投稿するかはユーザーがGitHub側で判断する。 */
export const buildSubmissionIssueUrl = (stage: Stage, geometricCount: number): string => {
  const title = `[ステージ投稿] ${stage.name}`;
  const animalsLine = animalCounts(stage)
    .map(([s, n]) => `${s}×${n}`)
    .join('、');
  const body = [
    '## ステージ投稿',
    '',
    `- 名前: ${stage.name}`,
    `- サイズ: ${stage.rows} x ${stage.cols}`,
    `- 動物: ${animalsLine}`,
    `- 検証: 唯一解（配置パターン ${geometricCount}${geometricCount >= 20 ? '+' : ''} 通り中、正解1通り）`,
    '',
    '### コード（src/levels/stages.ts に貼り付け用）',
    '',
    '```ts',
    buildStageCodeSnippet(stage),
    '```',
  ].join('\n');

  const params = new URLSearchParams({ title, body, labels: 'stage-submission' });
  return `${REPO_URL}/issues/new?${params.toString()}`;
};
