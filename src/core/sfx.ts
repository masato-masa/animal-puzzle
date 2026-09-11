/**
 * 効果音は WebAudio で合成する。音声ファイルは持たない
 * （読み込みゼロ・容量ゼロ・遅延ゼロ）。
 */
const MUTE_KEY = 'animal-puzzle:muted';

let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  /* 読めなくても既定の「鳴らす」で続行する */
}

export const isMuted = (): boolean => muted;

export const setMuted = (v: boolean): void => {
  muted = v;
  try {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0');
  } catch {
    /* 保存できなくてもこのセッションでは効く */
  }
};

/** AudioContext は最初のユーザー操作まで作らない（自動再生ポリシー対策）。 */
const audio = (): AudioContext | null => {
  if (muted) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

type Tone = {
  freq: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  /** 指定すると freq からここへ滑らせる。 */
  to?: number;
};

const play = (tones: Tone[]): void => {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  for (const t of tones) {
    const at = now + (t.delay ?? 0);
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = t.type ?? 'sine';
    osc.frequency.setValueAtTime(t.freq, at);
    if (t.to !== undefined) osc.frequency.exponentialRampToValueAtTime(t.to, at + t.dur);
    // 立ち上がりを 8ms 入れないとプチッというクリックノイズが乗る
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(t.gain ?? 0.16, at + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + t.dur);
    osc.connect(amp).connect(ac.destination);
    osc.start(at);
    osc.stop(at + t.dur + 0.02);
  }
};

export const sfx = {
  /** 選択。軽く短いクリック。 */
  select: () => play([{ freq: 880, dur: 0.05, type: 'triangle', gain: 0.09 }]),
  /** 配置。木質のポン。 */
  place: () => play([{ freq: 320, to: 180, dur: 0.13, type: 'triangle', gain: 0.2 }]),
  /** 却下。低い2音。 */
  reject: () =>
    play([
      { freq: 200, dur: 0.09, type: 'square', gain: 0.09 },
      { freq: 150, dur: 0.12, type: 'square', gain: 0.09, delay: 0.1 },
    ]),
  /** トレイに戻す。置くより軽く、下がる音。 */
  lift: () => play([{ freq: 420, to: 300, dur: 0.09, type: 'sine', gain: 0.1 }]),
  /** クリア。上行アルペジオ。 */
  clear: () =>
    play(
      [523.25, 659.25, 783.99, 1046.5].map((freq, i) => ({
        freq,
        dur: 0.26,
        type: 'triangle' as OscillatorType,
        gain: 0.14,
        delay: i * 0.09,
      }))
    ),
};

/** モバイルでの手応え。対応していない環境では何も起きない。 */
export const vibrate = (pattern: number | number[]): void => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* 環境によっては例外が飛ぶ */
  }
};
