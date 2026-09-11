# 構成

Vite + React 19 + TypeScript。ネイティブアプリではなく Web のみ（GitHub Pages）。

| 置き場所 | 役割 |
|---|---|
| `src/engine/` | ゲームのルール。配置・条件判定・解答器。**UI から独立していて、ここに UI の都合を持ち込まない。** |
| `src/levels/stages.ts` | 出荷ステージ40面。生成器で作り、唯一解と章ごとの難易度を満たすことがテスト済み。 |
| `src/lib/` | 条件の文言、難易度採点、設計チェック、Issue 投稿 URL。 |
| `src/storage/` | localStorage。呼び出し側の形を変えないため async のまま。 |
| `src/core/` | ハッシュルータ、WebAudio の効果音。 |
| `src/ui/` | 画面。`geometry.ts` が盤面の座標計算の唯一の出どころ。 |
| `src/art/` | 種の色（OKLCH で色相を11等分）と、ChatGPT に描かせたスプライト。 |
| `assets-src/` | スプライトの元になるシート画像。`scripts/slice-sprites.mjs` で切り出す。 |

## 設計で守ること

- **配置可否を UI に持たない。** `placeAnimal` / `moveAnimal` が状態を変えたかどうかだけで判断する。engine と二重管理しない。
- **駒を grid に参加させない。** 絶対配置で重ねる。これで駒を置いても消しても盤面が 1px も動かない。
- **盤面の矩形をキャッシュしない。** イベントのたびに `getBoundingClientRect()` を取り直す。旧実装が `measureInWindow` の非同期結果を保持していたのが「置いた駒が動かせない」の原因だった。
- **`aspect-ratio: cols / rows` を盤面カードに掛けない。** 余白と gap の本数が縦横で違うのでセルが正方形にならない（8列2行・幅460px で 20% ずれる）。セルの一辺 `--cell` を起点に組む。
- **`GAP` / `PAD` は `src/ui/geometry.ts` が唯一の出どころ。** CSS には書かず、インライン変数で流し込む。
- **操作はドラッグだけ。** タップで選んでタップで置く方式は直感的でないので入れない。カードなど掴める要素には必ず `touch-action: none` を付ける（無いとブラウザのスクロール判定に先を越され、長押しが要るように感じる）。
- **盤の上ならどこで離しても置ける。** いちばん近いマスの正しい位置からセル1辺の 0.38 倍より近ければ吸着し、それ以外はその場に残る。弾き返さない。マスにはまっていない駒は engine 上は tray に居て、UI が px 座標で持つ。
- **素材は1枚のシートにまとめて生成する。** 種ごとに別々に生成すると絵柄・線幅・光源・彩度が揃わず必ず破綻する（2026-09 に11種を別生成して全部捨てた）。描き直すときも 11 種まとめて 1 枚で生成し、`scripts/slice-sprites.mjs` が α の連結成分ごとに切り出す。

# Deploy

コードを直したら（テスト・型検査が緑になったら）、言われる前にコミットして反映する。

1. 変更をコミットして `master` に push する（公開ビルドの元）
2. `npm run deploy`（= `tsc --noEmit && vite build && node scripts/deploy.mjs`）
3. 反映されたことを確かめる: `curl -sI` で実際の `assets/*.js` を叩いて 200 を確認する
   （`index.html` は Jekyll が触らないので、それだけでは判定にならない）

`scripts/deploy.mjs` は `.nojekyll` を毎回書き出す。**これが無いと JS バンドルが
404 になり、CDN のキャッシュ不具合とそっくりの症状に見える。**

ハッシュルーティング（`#/game/stage-1`）なので、404.html のフォールバックは不要。

Live URL: https://masato-masa.github.io/animal-puzzle/
