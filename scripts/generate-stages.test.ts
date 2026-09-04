import * as fs from 'fs';
import * as path from 'path';
import { formatStageSnippet } from './format-stage';
import { CHAPTER_DEFS, generateForChapter } from './generate-stages';

test('generate 6 chapters x 5 stages and write to scripts/generated-stages.txt', () => {
  let globalIndex = 1;
  const stageBlocks: string[] = [];
  const chapterBlocks: string[] = [];
  // 全章で1つの重複除去セットを共有する。章ごとに別々のSetを使うと、同じ合格ライン
  // (例: 2〜4章はL3以上)を共有する複数の章が独立に同じ小さな組み合わせのプールを
  // 探索し、章をまたいで内容が丸ごと重複するステージが生成されてしまう。
  const sharedSeen = new Set<string>();

  for (const chapter of CHAPTER_DEFS) {
    const chapterStart = Date.now();
    const stages = generateForChapter({ chapterNumber: chapter.chapterNumber, needed: chapter.needed }, 150000, 300000, sharedSeen);
    console.log(`[gen] chapter ${chapter.chapterNumber}: ${stages.length}/${chapter.needed} in ${Date.now() - chapterStart}ms`);
    expect(stages.length).toBe(chapter.needed);

    const firstId = `stage-${globalIndex}`;
    for (const stage of stages) {
      const id = `stage-${globalIndex}`;
      const name = `${globalIndex}. ${chapter.name}`;
      stageBlocks.push(formatStageSnippet(stage, id, name));
      globalIndex++;
    }
    const lastId = `stage-${globalIndex - 1}`;
    chapterBlocks.push(
      `  { id: '${chapter.id}', name: '${chapter.name}', stageIds: stageIdsFrom('${firstId}', '${lastId}') },`
    );
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
}, 310000 * 6);
