import type { ConditionBlock, Species } from '@/engine';

/**
 * 種の色相（OKLCH の H）。明度 0.70 と彩度 0.12 は全種で固定し、色相だけを
 * 32.7 度ずつずらして 11 等分してある。
 *
 * 色は「種のラベル」であって写実ではない。ステージ内容を集計したところ 1 面に
 * 最大 8 種が同時に出て、55 ペア中 54 ペアが実際に同居するため、11 色すべてが
 * 相互に見分けられる必要がある。写実的な色（ライオン=黄、キリン=黄、ヒョウ=黄、
 * ゾウ=灰、サイ=灰、ゴリラ=黒…）では必ず衝突するのでこの方式を採った。
 *
 * 明度と彩度を固定するのが要点で、これをやらないと「どれか1色だけ浮く」盤面になる。
 * 全 22 色が sRGB 域内、最も近い2色（リス vs ライオン）でも弁別閾の 3.3 倍離れている。
 * シルエット（--ink）とのコントラストは最低 5.25:1。
 */
export const speciesHue: Record<Species, number> = {
  monkey: 25,
  squirrel: 58,
  lion: 90,
  giraffe: 123,
  crocodile: 156,
  oxpecker: 189,
  zebra: 221,
  gorilla: 254,
  rhino: 287,
  elephant: 320,
  leopard: 352,
};

const FACE_L = 0.7;
const FACE_C = 0.12;
const EDGE_L = 0.5;
const EDGE_C = 0.085;

/**
 * 駒やチップに流し込むインラインの CSS 変数。色相ひとつから面とふちを導くので、
 * 色を変えたくなったら speciesHue の数値ひとつを直すだけで済む。
 */
export const speciesVars = (species: Species): Record<string, string> => {
  const h = speciesHue[species];
  return {
    '--face': `oklch(${FACE_L} ${FACE_C} ${h})`,
    '--edge': `oklch(${EDGE_L} ${EDGE_C} ${h})`,
  };
};

export const speciesLabel: Record<Species, string> = {
  lion: 'ライオン',
  zebra: 'シマウマ',
  giraffe: 'キリン',
  elephant: 'ゾウ',
  crocodile: 'ワニ',
  oxpecker: 'ウシツツキ',
  squirrel: 'リス',
  monkey: 'サル',
  leopard: 'ヒョウ',
  rhino: 'サイ',
  gorilla: 'ゴリラ',
};

export const blockLabel: Record<ConditionBlock, string> = {
  water: '水辺',
  tree: '木',
};
