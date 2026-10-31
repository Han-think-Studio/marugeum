// 소리. 파일 없이 Web Audio 로 바람·비·불·새·풀벌레·테마를 합성한다.
// files.ts 에 경로가 적힌 채널은 파일을 반복 재생한다.
import { AUDIO_FILES } from './files';

export type LayerName = 'wind' | 'rain' | 'fire' | 'birds' | 'crickets' | 'theme';
export type Sfx = 'click' | 'step' | 'event' | 'death' | 'arrive' | 'fire';

const SETTINGS_KEY = 'marugeum.audio.v1';
const RAMP = 1.8; // 채널 음량이 바뀌는 데 걸리는 초

interface Layer {
  set(target: number, ctx: AudioContext): void;
  stop(): void;
}

// 2초짜리 백색 소음 버퍼. 모든 노이즈 채널이 같이 쓴다
function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function noiseSource(ctx: AudioContext, buf: AudioBuffer): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.start();
  return src;
}

function ramp(param: AudioParam, ctx: AudioContext, v: number, t = RAMP): void {
  param.cancelScheduledValues(ctx.currentTime);
  param.setValueAtTime(param.value, ctx.currentTime);
  param.linearRampToValueAtTime(v, ctx.currentTime + t);
}

// 파일 채널. volume 을 천천히 따라간다
class FileLayer implements Layer {
  private el: HTMLAudioElement;
  private cur = 0;
  private target = 0;
  private timer: number | null = null;

  constructor(path: string, private master: () => number) {
    this.el = new Audio(path);
    this.el.loop = true;
    this.el.volume = 0;
  }

  set(target: number): void {
    this.target = target;
    if (target > 0 && this.el.paused) this.el.play().catch(() => undefined);
    if (this.timer === null) this.timer = window.setInterval(() => this.tick(), 100);
  }

  private tick(): void {
    const step = 0.1 / RAMP;
    if (Math.abs(this.cur - this.target) <= step) this.cur = this.target;
    else this.cur += this.cur < this.target ? step : -step;
    this.el.volume = Math.max(0, Math.min(1, this.cur * this.master()));
    if (this.cur === this.target) {
      if (this.timer !== null) window.clearInterval(this.timer);
      this.timer = null;
      if (this.cur === 0) this.el.pause();
    }
  }

  stop(): void {
    this.el.pause();
  }
}

// 노이즈 기반 채널. 필터 체인과 느린 LFO
class NoiseLayer implements Layer {
  gain: GainNode;
  private nodes: AudioNode[] = [];

  constructor(ctx: AudioContext, buf: AudioBuffer, out: AudioNode, build: (src: AudioNode, ctx: AudioContext) => AudioNode) {
    const src = noiseSource(ctx, buf);
    const last = build(src, ctx);
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    last.connect(this.gain);
    this.gain.connect(out);
    this.nodes.push(src);
  }

  set(target: number, ctx: AudioContext): void {
    ramp(this.gain.gain, ctx, target);
  }

  stop(): void {
    for (const n of this.nodes) (n as AudioBufferSourceNode).stop?.();
  }
}

// 간헐적으로 짧은 소리를 내는 채널. 불꽃 튀는 소리, 새, 풀벌레
class EventLayer implements Layer {
  gain: GainNode;
  private level = 0;
  private timer: number | null = null;

  constructor(private ctx: AudioContext, out: AudioNode, private fire: (ctx: AudioContext, out: AudioNode, level: number) => number) {
    this.gain = ctx.createGain();
    this.gain.gain.value = 1;
    this.gain.connect(out);
  }

  set(target: number): void {
    this.level = target;
    if (target > 0 && this.timer === null) this.loop();
  }

  private loop(): void {
    if (this.level <= 0) {
      this.timer = null;
      return;
    }
    const next = this.fire(this.ctx, this.gain, this.level);
    this.timer = window.setTimeout(() => this.loop(), next);
  }

  stop(): void {
    this.level = 0;
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }
}

// 짧은 소음 한 방. 불꽃, 발소리
function burst(ctx: AudioContext, buf: AudioBuffer, out: AudioNode, freq: number, q: number, dur: number, vol: number, when = 0): void {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = ctx.createGain();
  const t = ctx.currentTime + when;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(out);
  src.start(t);
  src.stop(t + dur + 0.05);
}

// 짧은 음 하나. 새소리, 효과음, 테마 멜로디
function tone(ctx: AudioContext, out: AudioNode, type: OscillatorType, f0: number, f1: number, attack: number, dur: number, vol: number, when = 0): void {
  const o = ctx.createOscillator();
  o.type = type;
  const t = ctx.currentTime + when;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

// 테마. 계면조 느낌의 5음 음계를 천천히 거니는 멜로디와 낮은 드론
class ThemeLayer implements Layer {
  gain: GainNode;
  private level = 0;
  private timer: number | null = null;
  private drone: OscillatorNode[] = [];
  private droneGain: GainNode;
  private idx = 3;
  private readonly scale = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22].map((s) => 220 * Math.pow(2, s / 12));

  constructor(private ctx: AudioContext, out: AudioNode) {
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    // 잔향 비슷한 지연
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.46;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    this.gain.connect(lp).connect(out);
    lp.connect(delay).connect(fb).connect(delay);
    fb.connect(out);
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.18;
    this.droneGain.connect(this.gain);
    for (const f of [110, 164.81]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(this.droneGain);
      o.start();
      this.drone.push(o);
    }
  }

  set(target: number, ctx: AudioContext): void {
    this.level = target;
    ramp(this.gain.gain, ctx, target, 2.5);
    if (target > 0 && this.timer === null) this.loop();
  }

  private loop(): void {
    if (this.level <= 0) {
      this.timer = null;
      return;
    }
    const r = Math.random();
    if (r < 0.18) {
      // 쉼
    } else {
      const step = r < 0.5 ? (Math.random() < 0.5 ? -1 : 1) : r < 0.8 ? (Math.random() < 0.5 ? -2 : 2) : 0;
      this.idx = Math.max(0, Math.min(this.scale.length - 1, this.idx + step));
      const f = this.scale[this.idx];
      const dur = 1.6 + Math.random() * 1.6;
      tone(this.ctx, this.gain, 'triangle', f, f, 0.25, dur, 0.22);
      tone(this.ctx, this.gain, 'sine', f / 2, f / 2, 0.3, dur, 0.1);
    }
    this.timer = window.setTimeout(() => this.loop(), 1500 + Math.random() * 1800);
  }

  stop(): void {
    this.level = 0;
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    for (const o of this.drone) o.stop();
  }
}

export interface Targets {
  wind: number; rain: number; fire: number; birds: number; crickets: number; theme: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private layers: Partial<Record<LayerName, Layer>> = {};
  private buf: AudioBuffer | null = null;
  private pending: Targets = { wind: 0, rain: 0, fire: 0, birds: 0, crickets: 0, theme: 0 };
  muted = false;
  volume = 0.7;

  constructor() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const s = JSON.parse(raw) as { muted?: boolean; volume?: number };
        this.muted = !!s.muted;
        if (typeof s.volume === 'number') this.volume = s.volume;
      }
    } catch {
      // 저장소가 없으면 기본값
    }
  }

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  // 브라우저는 사용자 입력 뒤에만 소리를 허락한다. 첫 클릭이나 키 입력에서 부른다
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      this.master.connect(comp).connect(this.ctx.destination);
      this.buf = noiseBuffer(this.ctx);
      this.build();
      this.apply(this.pending);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => undefined);
  }

  private build(): void {
    const ctx = this.ctx!;
    const out = this.master!;
    const buf = this.buf!;
    const mk = (name: LayerName, fallback: () => Layer) => {
      const file = AUDIO_FILES[name];
      this.layers[name] = file ? new FileLayer(file, () => (this.muted ? 0 : this.volume)) : fallback();
    };
    mk('wind', () => new NoiseLayer(ctx, buf, out, (src, c) => {
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 320;
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.09;
      const depth = c.createGain();
      depth.gain.value = 160;
      lfo.connect(depth).connect(lp.frequency);
      lfo.start();
      const g = c.createGain();
      g.gain.value = 1.0;
      const lfo2 = c.createOscillator();
      lfo2.frequency.value = 0.05;
      const d2 = c.createGain();
      d2.gain.value = 0.35;
      lfo2.connect(d2).connect(g.gain);
      lfo2.start();
      return src.connect(lp).connect(g);
    }));
    mk('rain', () => new NoiseLayer(ctx, buf, out, (src, c) => {
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1400;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 3800;
      bp.Q.value = 0.4;
      return src.connect(hp).connect(bp);
    }));
    mk('fire', () => new EventLayer(ctx, out, (c, o, level) => {
      burst(c, buf, o, 1800 + Math.random() * 4000, 2 + Math.random() * 6, 0.03 + Math.random() * 0.06, level * 0.9);
      if (Math.random() < 0.3) burst(c, buf, o, 90 + Math.random() * 60, 1, 0.25, level * 0.5);
      return 40 + Math.random() * 320;
    }));
    mk('birds', () => new EventLayer(ctx, out, (c, o, level) => {
      const n = 2 + Math.floor(Math.random() * 4);
      const base = 2200 + Math.random() * 1600;
      for (let i = 0; i < n; i++) {
        const f = base * (1 + (Math.random() - 0.5) * 0.3);
        tone(c, o, 'sine', f, f * (1.1 + Math.random() * 0.3), 0.01, 0.07 + Math.random() * 0.08, level * 0.35, i * 0.14);
      }
      return 2500 + Math.random() * 7000;
    }));
    mk('crickets', () => new EventLayer(ctx, out, (c, o, level) => {
      const f = 3900 + Math.random() * 600;
      for (let i = 0; i < 6; i++) tone(c, o, 'sine', f, f, 0.01, 0.045, level * 0.25, i * 0.07);
      return 700 + Math.random() * 900;
    }));
    mk('theme', () => new ThemeLayer(ctx, out));
  }

  apply(t: Targets): void {
    this.pending = t;
    if (!this.ctx) return;
    (Object.keys(t) as LayerName[]).forEach((k) => this.layers[k]?.set(t[k], this.ctx!));
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.ctx && this.master) ramp(this.master.gain, this.ctx, m ? 0 : this.volume, 0.3);
    this.save();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // 음량 0..1. 켜져 있으면 바로 들린다
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.ctx && this.master && !this.muted) ramp(this.master.gain, this.ctx, this.volume, 0.15);
    this.save();
  }

  private save(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ muted: this.muted, volume: this.volume }));
    } catch {
      // 무시
    }
  }

  // 효과음. 짧고 한 번
  sfx(kind: Sfx): void {
    if (!this.ctx || !this.master || !this.buf) return;
    const c = this.ctx;
    const o = this.master;
    switch (kind) {
      case 'click':
        tone(c, o, 'sine', 900, 700, 0.005, 0.06, 0.12);
        break;
      case 'step':
        for (let i = 0; i < 4; i++) burst(c, this.buf, o, 500 + Math.random() * 300, 1.2, 0.09, 0.35, i * 0.32);
        break;
      case 'event':
        tone(c, o, 'sine', 196, 196, 0.4, 2.2, 0.25);
        tone(c, o, 'sine', 294, 294, 0.6, 2.0, 0.12, 0.1);
        break;
      case 'death':
        tone(c, o, 'triangle', 220, 55, 0.1, 3.5, 0.3);
        tone(c, o, 'sine', 110, 40, 0.3, 4.0, 0.25);
        break;
      case 'arrive':
        [220, 261.6, 329.6, 440].forEach((f, i) => tone(c, o, 'triangle', f, f, 0.05, 1.8, 0.22, i * 0.35));
        break;
      case 'fire':
        burst(c, this.buf, o, 2500, 3, 0.4, 0.5);
        burst(c, this.buf, o, 120, 1, 0.6, 0.4, 0.05);
        break;
    }
  }

  // 테스트용. 지금 마스터 출력에 신호가 있는지
  analyser(): AnalyserNode | null {
    if (!this.ctx || !this.master) return null;
    const a = this.ctx.createAnalyser();
    this.master.connect(a);
    return a;
  }
}

export const audio = new AudioEngine();
