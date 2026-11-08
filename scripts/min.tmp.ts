import { STAGES } from '@/levels/stages';
import { countSolutions, solverLevel } from '@/engine';
import fs from 'node:fs';
const out: Record<string,string[]> = {};
const t00=Date.now();
for (const s of STAGES) {
  const t0=Date.now();
  const sp = Object.keys(s.animalRules ?? {});
  const baseLevel = solverLevel(s);
  let found: string[]|null = null; let size=0;
  const n = sp.length;
  // masks by popcount asc
  const masks = Array.from({length:1<<n},(_,i)=>i).sort((a,b)=>pc(a)-pc(b)||a-b);
  function pc(x:number){let c=0;while(x){c+=x&1;x>>=1}return c}
  for (const m of masks) {
    const keep = sp.filter((_,i)=>m>>i&1);
    const ar:any = {}; for (const k of keep) ar[k]=(s.animalRules as any)[k];
    const t = {...s, animalRules: ar};
    if (countSolutions(t,2)!==1) continue;
    if (solverLevel(t)!==baseLevel) continue;
    found = keep; break;
  }
  out[s.id]=found ?? sp;
  console.log(s.id, baseLevel, sp.length,'->',(found??sp).length, (found??sp).join(','), Date.now()-t0,'ms');
}
fs.writeFileSync('scripts/min.tmp.json', JSON.stringify(out,null,1));
console.log('total ms', Date.now()-t00);
