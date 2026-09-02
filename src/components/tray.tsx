import { StyleSheet, View } from 'react-native';

import type { AnimalInstance, Species } from '@/engine';

import { AnimalChip } from './animal-chip';

type Props = {
  tray: AnimalInstance[];
  cell: number;
  hiddenInstanceId: string | null;
  onChipDragStart: (instanceId: string, species: Species, pageX: number, pageY: number) => void;
  onChipDragMove: (dx: number, dy: number) => void;
  onChipDragEnd: (dx: number, dy: number) => void;
};

export function Tray({ tray, cell, hiddenInstanceId, onChipDragStart, onChipDragMove, onChipDragEnd }: Props) {
  return (
    <View style={styles.wrap}>
      {tray.map((a) => (
        <AnimalChip
          key={a.instanceId}
          species={a.species}
          cell={cell}
          hidden={a.instanceId === hiddenInstanceId}
          onDragStart={(pageX, pageY) => onChipDragStart(a.instanceId, a.species, pageX, pageY)}
          onDragMove={onChipDragMove}
          onDragEnd={onChipDragEnd}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
