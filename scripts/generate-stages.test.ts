import * as fs from 'fs';
import * as path from 'path';
import { formatStageSnippet } from './format-stage';
import { CHAPTER_DEFS, STAGES_PER_CHAPTER, generateForChapter } from './generate-stages';

test('generate 6 chapters x 5 stages and write to scripts/generated-stages.txt', () => {
  let globalIndex = 1;
  const stageBlocks: string[] = [];
  const chapterBlocks: string[] = [];

  for (const chapter of CHAPTER_DEFS) {
    const stages = generateForChapter({ chapterNumber: chapter.chapterNumber, needed: STAGES_PER_CHAPTER }, 20000, 120000);
    expect(stages.length).toBe(STAGES_PER_CHAPTER);

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
}, 130000 * 6);
