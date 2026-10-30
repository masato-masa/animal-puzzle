/**
 * 効果音と BGM。
 *
 * 効果音は録音（ElevenLabs で生成した音。src/assets/sfx/<名前>.wav）を鳴らす。
 * 録音がまだ読み込めていない音だけ、WebAudio の合成音で代わりに鳴らす。
 * BGM は Suno で作った曲（src/assets/bgm/main.mp3）を <audio> でループする。
 */
const MUTE_KEY = 'animal-puzzle:muted';
const BGM_KEY = 'animal-puzzle:bgm';

// ?mute を付けて開いたときは、効果音も BGM も鳴らさない（確認用）。
const forceMute = typeof location !== 'undefined' && new URLSearchParams(location.search).has('mute');

let ctx: AudioContext | null = null;
let bgmBus: GainNode | null = null;
let muted = forceMute;
let bgmOn = !forceMute;
try {
  if (!forceMute) {
    muted = localStorage.getItem(MUTE_KEY) === '1';
    bgmOn = localStorage.getItem(BGM_KEY) !== '0';
  }
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

export const isBgmOn = (): boolean => bgmOn;

export const setBgmOn = (v: boolean): void => {
  bgmOn = v;
  try {
    localStorage.setItem(BGM_KEY, v ? '1' : '0');
  } catch {
    /* 保存できなくてもこのセッションでは効く */
  }
  if (v) startBgm();
  else bgmEl?.pause();
};

/** AudioContext は最初のユーザー操作まで作らない（自動再生ポリシー対策）。 */
const context = (): AudioContext | null => {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
    bgmBus = ctx.createGain();
    bgmBus.gain.value = BGM_GAIN;
    bgmBus.connect(ctx.destination);
    loadSamples(ctx);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

const audio = (): AudioContext | null => (muted ? null : context());

// ---- 録音 ----

type SampleName = 'select' | 'place' | 'lift' | 'clear';
const sampleUrls = import.meta.glob('../assets/sfx/*.wav', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
const buffers = new Map<SampleName, AudioBuffer>();
/** 録音はピーク 0.9 にそろえてあるので、役割に合わせて下げる。 */
const SAMPLE_GAIN: Record<SampleName, number> = { select: 0.3, place: 0.6, lift: 0.35, clear: 0.7 };

function loadSamples(ac: AudioContext): void {
  for (const [path, url] of Object.entries(sampleUrls)) {
    const m = /\/(\w+)\.wav$/.exec(path);
    if (!m) continue;
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((d) => ac.decodeAudioData(d))
      .then((buf) => buffers.set(m[1] as SampleName, buf))
      .catch(() => {
        /* 読めなければ合成音のまま */
      });
  }
}

/** 録音を鳴らす。音程 ±5%・音量 ±10% ずらして、続けて鳴っても機械的にしない。鳴らせたら true。 */
const sample = (name: SampleName): boolean => {
  const ac = audio();
  const buf = buffers.get(name);
  if (!ac || !buf) return false;
  const jitter = name !== 'clear';
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = jitter ? 1 + (Math.random() * 2 - 1) * 0.05 : 1;
  const g = ac.createGain();
  g.gain.value = SAMPLE_GAIN[name] * (jitter ? 1 + (Math.random() * 2 - 1) * 0.1 : 1);
  src.connect(g).connect(ac.destination);
  src.start();
  return true;
};

// ---- 合成音（録音が無いときの代わり） ----

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
  select: () => sample('select') || play([{ freq: 880, dur: 0.05, type: 'triangle', gain: 0.09 }]),
  /** 配置。木質のポン。 */
  place: () => sample('place') || play([{ freq: 320, to: 180, dur: 0.13, type: 'triangle', gain: 0.2 }]),
  /* 却下音は持たない。盤の上ならどこで離してもその場に置けるので、
     弾かれる場面が無くなった。 */
  /** マスにはまらずその場に置いた、またはリストに戻した。置くより軽い音。 */
  lift: () => sample('lift') || play([{ freq: 420, to: 300, dur: 0.09, type: 'sine', gain: 0.1 }]),
  /** クリア。 */
  clear: () =>
    sample('clear') ||
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

// ---- BGM ----

/** BGM の音量。効果音の下で、考えるのを邪魔しない小ささ（約 −20dB）。 */
const BGM_GAIN = 0.1;
const bgmUrl = Object.values(
  import.meta.glob('../assets/bgm/main.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
)[0];
let bgmEl: HTMLAudioElement | null = null;
let bgmNode: MediaElementAudioSourceNode | null = null;
let retryArmed = false;

const bgmElement = (): HTMLAudioElement | null => {
  if (!bgmUrl || typeof Audio === 'undefined') return null;
  if (!bgmEl) {
    bgmEl = new Audio(bgmUrl);
    bgmEl.preload = 'auto';
    bgmEl.loop = true;
  }
  return bgmEl;
};

function startBgm(): void {
  if (!bgmOn) return;
  const el = bgmElement();
  const ac = context();
  if (!el || !ac || !bgmBus) return;
  if (!bgmNode) {
    bgmNode = ac.createMediaElementSource(el);
    bgmNode.connect(bgmBus);
  }
  bgmBus.gain.cancelScheduledValues(ac.currentTime);
  bgmBus.gain.setValueAtTime(0.0001, ac.currentTime);
  bgmBus.gain.exponentialRampToValueAtTime(BGM_GAIN, ac.currentTime + 1.2);
  if (el.paused) void el.play().catch(() => armRetry());
}

function armRetry(): void {
  if (retryArmed || typeof window === 'undefined') return;
  retryArmed = true;
  const events = ['pointerdown', 'keydown'];
  const go = (): void => {
    for (const ev of events) window.removeEventListener(ev, go, true);
    retryArmed = false;
    window.setTimeout(startBgm, 0);
  };
  for (const ev of events) window.addEventListener(ev, go, true);
}

if (typeof document !== 'undefined') {
  // ページを開いた時点から読み始め、最初の操作で流れ始める。
  if (bgmOn) {
    bgmElement();
    armRetry();
  }
  // 別のタブやアプリに移ったら止め、戻ったら続きから流す。
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) bgmEl?.pause();
    else if (bgmOn && bgmNode) void bgmEl?.play().catch(() => armRetry());
  });
}
