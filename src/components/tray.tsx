import { StyleSheet, View } from 'react-native';

import type { AnimalInstance, Species } from '@/engine';

import { AnimalChip } from './animal-chip';

type Props = {
  tray: AnimalInstance[];
  cell: number;
  /** 各ピースの位置（トレイ枠を基準にしたpx）。取っても他のピースは動かない。 */
  positions: Record<string, { x: number; y: number }>;
  size: { width: number; height: number };
  hiddenInstanceId: string | null;
  onChipDragStart: (instanceId: string, species: Species, pageX: number, pageY: number) => void;
  onChipDragMove: (dx: number, dy: number) => void;
  onChipDragEnd: (dx: number, dy: number) => void;
};

/** ピースを自由な位置に置けるトレイ枠。並び替え・再整列はしない。 */
export function Tray({ tray, cell, positions, size, hiddenInstanceId, onChipDragStart, onChipDragMove, onChipDragEnd }: Props) {
  return (
    <View style={[styles.zone, { width: size.width, height: size.height }]}>
      {tray.map((a) => {
        const pos = positions[a.instanceId] ?? { x: 0, y: 0 };
        return (
          <View key={a.instanceId} style={[styles.slot, { left: pos.x, top: pos.y }]}>
            <AnimalChip
              species={a.species}
              cell={cell}
              hidden={a.instanceId === hiddenInstanceId}
              onDragStart={(pageX, pageY) => onChipDragStart(a.instanceId, a.species, pageX, pageY)}
              onDragMove={onChipDragMove}
              onDragEnd={onChipDragEnd}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    position: 'relative',
    alignSelf: 'center',
  },
  slot: {
    position: 'absolute',
  },
});
