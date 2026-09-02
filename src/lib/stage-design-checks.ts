import type { Stage } from '@/engine';

export type DesignWarning =
  | { kind: 'deadEdgeRow'; index: number }
  | { kind: 'deadEdgeCol'; index: number }
  | { kind: 'isolatedSingleCell'; r: number; c: number };

/**
 * 「無駄に広い盤面」と「工夫のいらない配置」を検出するステージ作成時のヒント。
 * 唯一解かどうかとは別の、質のチェック（保存をブロックはしない）。
 */
export const findDesignWarnings = (stage: Stage): DesignWarning[] => {
  const { rows, cols, terrain } = stage;
  const warnings: DesignWarning[] = [];

  const isDeadRow = (r: number) => terrain[r].every((t) => t !== 'land');
  const isDeadCol = (c: number) => terrain.every((row) => row[c] !== 'land');

  // 盤面の端が全マス壁なのは、5x5より大きいなら詰められる余白（仕切りとして意味があるのは内側だけ）。
  if (rows > 5) {
    if (isDeadRow(0)) warnings.push({ kind: 'deadEdgeRow', index: 0 });
    if (isDeadRow(rows - 1)) warnings.push({ kind: 'deadEdgeRow', index: rows - 1 });
  }
  if (cols > 5) {
    if (isDeadCol(0)) warnings.push({ kind: 'deadEdgeCol', index: 0 });
    if (isDeadCol(cols - 1)) warnings.push({ kind: 'deadEdgeCol', index: cols - 1 });
  }

  // 孤立した1マスの平地は「1マス種（リス）しか入らない」と即決まってしまい、考える余地がない。
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (terrain[r][c] !== 'land' || visited[r][c]) continue;
      const stack: [number, number][] = [[r, c]];
      visited[r][c] = true;
      const cells: [number, number][] = [];
      while (stack.length) {
        const [cr, cc] = stack.pop()!;
        cells.push([cr, cc]);
        for (const [dr, dc] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ] as const) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && terrain[nr][nc] === 'land' && !visited[nr][nc]) {
            visited[nr][nc] = true;
            stack.push([nr, nc]);
          }
        }
      }
      if (cells.length === 1) warnings.push({ kind: 'isolatedSingleCell', r: cells[0][0], c: cells[0][1] });
    }
  }

  return warnings;
};

export const describeWarning = (w: DesignWarning): string => {
  switch (w.kind) {
    case 'deadEdgeRow':
      return `${w.index + 1}行目がすべて壁で無駄になっています。盤面を1行分縮めましょう。`;
    case 'deadEdgeCol':
      return `${w.index + 1}列目がすべて壁で無駄になっています。盤面を1列分縮めましょう。`;
    case 'isolatedSingleCell':
      return `(${w.r + 1}行目, ${w.c + 1}列目)は孤立した1マスで、リスしか入らずひと目で決まってしまいます。`;
  }
};
