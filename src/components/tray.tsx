import { StyleSheet, View } from 'react-native';

import type { AnimalInstance } from '@/engine';

import { AnimalChip } from './animal-chip';

type Props = {
  tray: AnimalInstance[];
  selectedInstanceId: string | null;
  onSelect: (instanceId: string) => void;
};

export function Tray({ tray, selectedInstanceId, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      {tray.map((a) => (
        <AnimalChip
          key={a.instanceId}
          species={a.species}
          selected={a.instanceId === selectedInstanceId}
          onPress={() => onSelect(a.instanceId)}
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
