/**
 * むげんモードの生成器の監査。生成時間・梯子のどの段で出たか・難易度の分布を測る。
 * パラメータ（src/levels/endless.ts の targetFor・rungsFor・重み）を変えたら毎回走らせる。
 *
 *   npx vite-node scripts/audit-endless.ts            # 1〜200 面
 *   npx vite-node scripts/audit-endless.ts 1 50       # 範囲を指定
 *   npx vite-node scripts/audit-endless.ts 1 20 0     # 予算倍率 0（最終段だけ）
 */
import { countSolutions } from '@/engine';
import { findDesignWarnings } from '@/lib/stage-design-checks';
import { generateEndless, rungsFor, targetFor } from '@/levels/endless';

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flag = (name: string, fallback: number) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : fallback;
};
const from = Number(positional[0] ?? 1);
const to = Number(positional[1] ?? 200);
const budgetScale = Number(positional[2] ?? 1);
/** 分布表の 1 行に入れる面の数（--band=10 など）。 */
const band = flag('band', 20);

type Row = { n: number; ms: number; rung: number; level: string; pieces: number; rules: number; size: string; attempts: number };
const rows: Row[] = [];
let broken = 0;

for (let n = from; n <= to; n++) {
  const t0 = performance.now();
  const r = generateEndless(n, { budgetScale });
  const ms = performance.now() - t0;
  if (countSolutions(r.stage, 2) !== 1 || findDesignWarnings(r.stage).length > 0) broken++;
  rows.push({
    n,
    ms,
    rung: r.rung,
    level: r.level,
    pieces: r.stage.animals.length,
    rules: r.rules,
    size: `${r.stage.rows}x${r.stage.cols}`,
    attempts: r.attempts,
  });
}

const fmt = (x: number) => x.toFixed(0);
const finalRung = rungsFor(1).length;
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
const pct = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))];

const ms = rows.map((r) => r.ms);
console.log(`面 ${from}〜${to}（予算倍率 ${budgetScale}）`);
console.log(`生成時間 平均 ${fmt(avg(ms))}ms / 中央 ${fmt(pct(ms, 0.5))}ms / 95% ${fmt(pct(ms, 0.95))}ms / 最大 ${fmt(Math.max(...ms))}ms`);
console.log(`唯一解でない・警告あり: ${broken} 面`);
const att = rows.map((r) => r.attempts);
console.log(`試行回数 平均 ${avg(att).toFixed(1)} / 最大 ${Math.max(...att)}（段0の予算 ${rungsFor(1, budgetScale)[0].attempts}）`);
const rungCounts = Array.from({ length: finalRung + 1 }, (_, i) => rows.filter((r) => r.rung === i).length);
console.log(`出た段: ${rungCounts.map((c, i) => `${i === finalRung ? '最終(手作り)' : `段${i}`}=${c}`).join(' ')}`);

const bands: Array<[number, number]> = [];
for (let s = from; s <= to; s += band) bands.push([s, Math.min(to, s + band - 1)]);
console.log('\n| 面 | 目標(駒/L/ルール) | 平均駒 | 平均ルール | L1 | L2 | L3 | L4 | L5+ | 平均ms | 最大ms |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|');
for (const [a, b] of bands) {
  const rs = rows.filter((r) => r.n >= a && r.n <= b);
  const t = targetFor(Math.round((a + b) / 2));
  const lv = (l: string) => rs.filter((r) => r.level === l).length;
  console.log(
    `| ${a}-${b} | ${t.pieces.toFixed(1)}/${t.level.toFixed(1)}/${t.rules.toFixed(1)} | ${avg(rs.map((r) => r.pieces)).toFixed(1)} | ${avg(
      rs.map((r) => r.rules)
    ).toFixed(1)} | ${lv('L1')} | ${lv('L2')} | ${lv('L3')} | ${lv('L4')} | ${lv('unsolvable')} | ${fmt(avg(rs.map((r) => r.ms)))} | ${fmt(
      Math.max(...rs.map((r) => r.ms))
    )} |`
  );
}

if (process.argv.includes('--list')) for (const r of rows) console.log(JSON.stringify(r));
