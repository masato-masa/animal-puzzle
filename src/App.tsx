import { boundingBox, SPECIES, type Species } from '@/engine';
import { speciesLabel, speciesVars } from '@/art/palette';
import { SpeciesSilhouette } from '@/art/species';
import { TreeIcon, WaterIcon } from '@/art/blocks';

const ALL = Object.keys(SPECIES) as Species[];
const GAP = 6;

function Chip({ species, cell }: { species: Species; cell: number }) {
  const { w, h } = boundingBox(species);
  return (
    <div
      style={
        {
          ...speciesVars(species),
          width: w * cell + (w - 1) * GAP,
          height: h * cell + (h - 1) * GAP,
          background: 'var(--face)',
          boxShadow: 'inset 0 -4px 0 0 var(--edge)',
          borderRadius: 8,
          color: 'var(--ink)',
          display: 'grid',
          placeItems: 'center',
        } as React.CSSProperties
      }>
      <SpeciesSilhouette species={species} />
    </div>
  );
}

/** Task 4 の目視確認用。次のタスクで本物の画面に差し替える。 */
export function App() {
  return (
    <div className="app">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', maxWidth: 960 }}>
        {ALL.map((sp) => (
          <div key={sp} style={{ textAlign: 'center' }}>
            <Chip species={sp} cell={120} />
            <small>{speciesLabel[sp]}</small>
          </div>
        ))}
      </div>

      {/* 実寸の最悪ケース: 8列の盤面をモバイル幅で出したときのセル */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', justifyContent: 'center' }}>
        {ALL.map((sp) => (
          <Chip key={sp} species={sp} cell={34} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        {[
          ['var(--water)', <WaterIcon key="w" />],
          ['var(--tree)', <TreeIcon key="t" />],
          ['var(--wall)', null],
          ['var(--land)', null],
        ].map(([bg, icon], i) => (
          <div
            key={i}
            style={{
              background: bg as string,
              width: 64,
              height: 64,
              borderRadius: 8,
              display: 'grid',
              placeItems: 'center',
            }}>
            {icon as React.ReactNode}
          </div>
        ))}
      </div>
    </div>
  );
}
