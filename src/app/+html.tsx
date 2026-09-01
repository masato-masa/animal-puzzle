import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Web用のルートHTML。ピンチズーム/ダブルタップズームを無効化する。
 * これが無いと、スマホでドラッグ操作をしようとした指の動きがブラウザに
 * 「拡大縮小ジェスチャー」として奪われ、ピースが動かせなかったり
 * 画面の一部だけ縮んで見えたりする不具合が起きる。
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
