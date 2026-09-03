import type { CellTerrain, Stage } from '@/engine';

const VALID: ReadonlySet<string> = new Set<CellTerrain>(['land', 'wall', 'water', 'tree', 'void']);

/**
 * 保存済みステージの地形を現在のCellTerrainに合わせる。廃止した'sky'や未知の値は
 * 'void'（マスが存在しない）に倒す。水は「乗れる地形」から「乗れないブロック」に
 * 意味が変わったが、値そのものは同じなのでそのまま残す。
 */
export const migrateStageTerrain = (stage: Stage): Stage => ({
  ...stage,
  terrain: stage.terrain.map((row) => row.map((t) => (VALID.has(t) ? t : ('void' as CellTerrain)))),
});
