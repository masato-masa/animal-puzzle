import * as fs from 'fs';
import * as path from 'path';
import { formatStageSnippet } from './format-stage';
import { CHAPTER_DEFS, CHAPTER_TIERS, generateForChapter, splitPoolAcrossChapters } from './generate-stages';
import type { Stage } from '@/engine';

test('generate stages for every chapter tier and write to scripts/generated-stages.txt', () => {
  let globalIndex = 1;
  const stageBlocks: string[] = [];
  const chapterBlocks: string[] = [];
  // 全ティア(=章)で1つの重複除去セットを共有する。ティアごとに別々のSetを使うと、
  // 同じ合格ラインを共有する章どうしが独立に同じ小さな組み合わせのプールを探索し、
  // 章をまたいで内容が丸ごと重複するステージが生成されてしまう。
  const sharedSeen = new Set<string>();

  for (const tier of CHAPTER_TIERS) {
    const chapters = tier.chapterNumbers.map((n) => CHAPTER_DEFS.find((c) => c.chapterNumber === n)!);
    // ティア内の全章分をまとめて1プールとして探索する(章ごとの必要数を機械的に
    // 決め打ちせず、実際に見つかった総数を後から均等に分配する)。
    const targetTotal = chapters.length * 5;
    const tierStart = Date.now();
    const pool = generateForChapter(
      { chapterNumber: tier.chapterNumbers[0], needed: targetTotal },
      200000,
      280000 * chapters.length,
      sharedSeen
    );
    console.log(
      `[gen] tier [${tier.chapterNumbers.join(',')}]: found ${pool.length}/${targetTotal} in ${Date.now() - tierStart}ms`
    );
    expect(pool.length).toBeGreaterThanOrEqual(chapters.length);

    const split = splitPoolAcrossChapters(pool, chapters.length);
    chapters.forEach((chapter, i) => {
      const stages: Stage[] = split[i];
      const firstId = `stage-${globalIndex}`;
      for (const stage of stages) {
        const id = `stage-${globalIndex}`;
        // ここでの名前は章名の使い回しのプレースホルダー。出荷前に stages.ts 側で
        // 動物構成に応じた個別のステージ名へ手動で書き換えること(章名の連呼のまま
        // 出荷しない)。
        const name = `${globalIndex}. ${chapter.name}`;
        stageBlocks.push(formatStageSnippet(stage, id, name));
        globalIndex++;
      }
      const lastId = `stage-${globalIndex - 1}`;
      chapterBlocks.push(
        `  { id: '${chapter.id}', name: '${chapter.name}', stageIds: stageIdsFrom('${firstId}', '${lastId}') },`
      );
    });
  }

  const output = `// このファイルは scripts/generate-stages.test.ts の実行で生成された。
// src/levels/stages.ts のSTAGES配列・CHAPTERS配列にそのまま貼り付けること。

export const GENERATED_STAGES = \`
${stageBlocks.join('\n')}
\`;

export const GENERATED_CHAPTERS = \`
${chapterBlocks.join('\n')}
\`;
`;

  fs.writeFileSync(path.join(__dirname, 'generated-stages.txt'), output);
}, 280000 * 6);
