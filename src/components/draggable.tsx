import { useEffect, useRef, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';

type Props = {
  /** ドラッグ開始時。つかんだ瞬間のピースの左上ページ座標を渡す。 */
  onDragStart: (pageX: number, pageY: number) => void;
  /** ドラッグ中。開始位置からの累積移動量(px)。 */
  onDragMove: (dx: number, dy: number) => void;
  /** ドラッグ終了。累積移動量と、指を離した瞬間のページ座標。 */
  onDragEnd: (dx: number, dy: number, pageX: number, pageY: number) => void;
  children: React.ReactNode;
};

/**
 * つまんで動かす操作のための薄いラッパー。react-native-gesture-handlerではなく
 * 標準のPanResponderを使う（snake-puzzleと同じ方針、追加依存なしでWeb/ネイティブ両対応）。
 * ドラッグ中の見た目（追従表示）は呼び出し側がonDragStart/Moveの値を使って
 * 別レイヤー（DragOverlayなど）に描画する想定で、この中では移動しない。
 *
 * PanResponderはuseRefで一度だけ生成するため、内部から呼ぶコールバックは
 * 常に最新のpropsを指すref経由で呼び出す（そうしないとマウント時点の古いクロージャが
 * 固定されてしまい、その後のstate更新が反映されない）。
 */
export function Draggable({ onDragStart, onDragEnd, onDragMove, children }: Props) {
  const viewRef = useRef<View>(null);
  const callbacks = useRef({ onDragStart, onDragMove, onDragEnd });
  useEffect(() => {
    callbacks.current = { onDragStart, onDragMove, onDragEnd };
  });

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, gesture) => Math.abs(gesture.dx) + Math.abs(gesture.dy) > 2,
      onPanResponderGrant: () => {
        viewRef.current?.measureInWindow((x, y) => callbacks.current.onDragStart(x, y));
      },
      onPanResponderMove: (_e, gesture) => {
        callbacks.current.onDragMove(gesture.dx, gesture.dy);
      },
      onPanResponderRelease: (_e, gesture) => {
        callbacks.current.onDragEnd(gesture.dx, gesture.dy, gesture.moveX, gesture.moveY);
      },
      onPanResponderTerminate: (_e, gesture) => {
        callbacks.current.onDragEnd(gesture.dx, gesture.dy, gesture.moveX, gesture.moveY);
      },
    })
  ).current;

  return (
    <View ref={viewRef} style={styles.noSelect} {...responder.panHandlers}>
      {children}
    </View>
  );
}

const styles = {
  // Web専用: ドラッグ中にブラウザの文字選択が発生して指の動きを奪うのを防ぐ。
  noSelect: { userSelect: 'none' } as const,
};

/** 必要なタイミングで最新のページ座標を測り直せるコンテナ用。 */
export function useMeasuredRect() {
  const ref = useRef<View>(null);
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const measure = () => {
    ref.current?.measureInWindow((x, y, w, h) => setRect({ x, y, w, h }));
  };

  const onLayout = (_e: LayoutChangeEvent) => measure();

  return { ref, rect, onLayout, measure };
}
