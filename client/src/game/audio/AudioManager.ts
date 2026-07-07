import { useEffect, useCallback } from 'react';
import { useSettingsStore } from '../../stores';

type SoundType =
  | 'engine_idle' | 'engine_accel' | 'brake' | 'horn' | 'collision'
  | 'skid' | 'rain' | 'wind' | 'birds' | 'traffic' | 'siren' | 'temple_bell' | 'nitro';

interface EngineSynth {
  baseOsc: OscillatorNode;
  harmOsc: OscillatorNode;
  baseGain: GainNode;
  harmGain: GainNode;
  filter: BiquadFilterNode;
  outputGain: GainNode;
}

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engine: EngineSynth | null = null;
  private volumes: Record<string, number> = {
    engine: 0.7, ambient: 0.5, ui: 0.6, master: 0.8,
  };

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = this.volumes.master;
  }

  private resumeContext() {
    if (this.ctx?.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  setVolumes(volumes: { master: number; engine: number; ambient: number }) {
    this.volumes = { ...this.volumes, ...volumes };
    if (this.masterGain) this.masterGain.gain.value = volumes.master;
  }

  private ensureEngine() {
    if (!this.ctx || !this.masterGain || this.engine) return;

    const baseOsc = this.ctx.createOscillator();
    const harmOsc = this.ctx.createOscillator();
    const baseGain = this.ctx.createGain();
    const harmGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const outputGain = this.ctx.createGain();

    baseOsc.type = 'sine';
    harmOsc.type = 'triangle';

    baseOsc.frequency.value = 52;
    harmOsc.frequency.value = 104;
    baseGain.gain.value = 0.55;
    harmGain.gain.value = 0.2;

    filter.type = 'lowpass';
    filter.frequency.value = 320;
    filter.Q.value = 0.7;

    outputGain.gain.value = 0;

    baseOsc.connect(baseGain);
    harmOsc.connect(harmGain);
    baseGain.connect(filter);
    harmGain.connect(filter);
    filter.connect(outputGain);
    outputGain.connect(this.masterGain);

    baseOsc.start();
    harmOsc.start();

    this.engine = { baseOsc, harmOsc, baseGain, harmGain, filter, outputGain };
  }

  playEngine(
    speed: number,
    maxSpeed: number,
    health: number,
    throttle = 0,
    braking = 0,
  ) {
    if (!this.ctx || !this.masterGain) return;
    this.resumeContext();
    this.ensureEngine();
    if (!this.engine) return;

    const t = this.ctx.currentTime;
    const speedNorm = Math.min(Math.max(speed / Math.max(maxSpeed, 1), 0), 1);
    const throttleNorm = Math.min(Math.max(throttle, 0), 1);
    const brakeNorm = Math.min(Math.max(braking, 0), 1);

    const baseFreq = 48 + speedNorm * 110 + throttleNorm * 18;
    const harmFreq = baseFreq * 2.02;
    const smooth = 0.12;

    this.engine.baseOsc.frequency.setTargetAtTime(baseFreq, t, smooth);
    this.engine.harmOsc.frequency.setTargetAtTime(harmFreq, t, smooth);
    this.engine.filter.frequency.setTargetAtTime(260 + speedNorm * 620 + throttleNorm * 120, t, 0.18);

    const healthMul = health < 50 ? 0.75 : health < 20 ? 0.45 : 1;
    const idleVol = 0.04;
    const cruiseVol = idleVol + speedNorm * 0.16 + throttleNorm * 0.1;
    const brakeDip = brakeNorm * 0.06;
    const targetVol = Math.max(idleVol, cruiseVol - brakeDip) * this.volumes.engine * healthMul;

    this.engine.outputGain.gain.setTargetAtTime(targetVol, t, 0.1);
    this.engine.baseGain.gain.setTargetAtTime(health < 50 ? 0.45 : 0.55, t, 0.2);
    this.engine.harmGain.gain.setTargetAtTime(health < 50 ? 0.28 : 0.2, t, 0.2);
  }

  playCelebration() {
    if (!this.ctx || !this.masterGain) return;
    this.resumeContext();
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = t + i * 0.12;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.22 * this.volumes.master, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 0.36);
    });

    const cheer = this.ctx.createBufferSource();
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    }
    cheer.buffer = buffer;
    const cheerFilter = this.ctx.createBiquadFilter();
    const cheerGain = this.ctx.createGain();
    cheerFilter.type = 'bandpass';
    cheerFilter.frequency.value = 1200;
    cheerGain.gain.value = 0.08 * this.volumes.master;
    cheer.connect(cheerFilter);
    cheerFilter.connect(cheerGain);
    cheerGain.connect(this.masterGain);
    cheer.start(t + 0.35);
    cheer.stop(t + 0.85);
  }

  playCollisionImpact(severity: 'small' | 'medium' | 'large' | 'heavy', speedKmh: number) {
    if (!this.ctx || !this.masterGain) return;
    this.resumeContext();

    const t = this.ctx.currentTime;
    const intensity: Record<string, number> = {
      small: 0.45,
      medium: 0.7,
      large: 0.9,
      heavy: 1,
    };
    const power = (intensity[severity] ?? 0.6) * Math.min(speedKmh / 70, 1.3) * this.volumes.master;

    const makeNoiseBurst = (duration: number, vol: number, freq: number, q = 1) => {
      const len = Math.floor(this.ctx!.sampleRate * duration);
      const buffer = this.ctx!.createBuffer(1, len, this.ctx!.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const env = Math.pow(1 - i / len, 1.8);
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const src = this.ctx!.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = q;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      src.start(t);
      src.stop(t + duration);
    };

    // Heavy thump — metal / body impact
    const thump = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(110 + speedKmh * 0.4, t);
    thump.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    thumpGain.gain.setValueAtTime(power * 0.55, t);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    thump.connect(thumpGain);
    thumpGain.connect(this.masterGain);
    thump.start(t);
    thump.stop(t + 0.22);

    // Crunch — filtered noise
    makeNoiseBurst(0.28, power * 0.42, 420, 0.9);
    // Glass / debris tinkle on harder hits
    if (severity !== 'small') {
      makeNoiseBurst(0.18, power * 0.22, 1800, 2.2);
    }
    if (severity === 'large' || severity === 'heavy') {
      makeNoiseBurst(0.35, power * 0.3, 260, 0.6);
      const clang = this.ctx.createOscillator();
      const clangGain = this.ctx.createGain();
      clang.type = 'triangle';
      clang.frequency.setValueAtTime(240, t + 0.04);
      clang.frequency.exponentialRampToValueAtTime(90, t + 0.3);
      clangGain.gain.setValueAtTime(power * 0.25, t + 0.04);
      clangGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      clang.connect(clangGain);
      clangGain.connect(this.masterGain);
      clang.start(t + 0.04);
      clang.stop(t + 0.32);
    }
  }

  playOneShot(type: SoundType) {
    if (!this.ctx || !this.masterGain) return;
    this.resumeContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const t = this.ctx.currentTime;

    const configs: Partial<Record<SoundType, { freq: number; type: OscillatorType; duration: number; vol: number }>> = {
      horn: { freq: 320, type: 'sine', duration: 0.35, vol: 0.18 },
      brake: { freq: 140, type: 'triangle', duration: 0.25, vol: 0.12 },
      collision: { freq: 90, type: 'triangle', duration: 0.35, vol: 0.28 },
      skid: { freq: 120, type: 'triangle', duration: 0.4, vol: 0.15 },
      nitro: { freq: 220, type: 'sine', duration: 0.8, vol: 0.2 },
      siren: { freq: 520, type: 'sine', duration: 0.45, vol: 0.16 },
      temple_bell: { freq: 440, type: 'sine', duration: 1.2, vol: 0.12 },
    };

    const cfg = configs[type];
    if (!cfg) return;

    osc.type = cfg.type;
    osc.frequency.setValueAtTime(cfg.freq, t);
    filter.type = 'lowpass';
    filter.frequency.value = 900;

    gain.gain.setValueAtTime(cfg.vol * this.volumes.master, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + cfg.duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + cfg.duration);
  }

  stopEngine() {
    if (!this.ctx || !this.engine) return;
    const t = this.ctx.currentTime;
    this.engine.outputGain.gain.setTargetAtTime(0, t, 0.15);
    const engine = this.engine;
    window.setTimeout(() => {
      if (this.engine !== engine) return;
      try {
        engine.baseOsc.stop();
        engine.harmOsc.stop();
      } catch {
        // already stopped
      }
      this.engine = null;
    }, 250);
  }

  dispose() {
    this.stopEngine();
    this.ctx?.close();
    this.ctx = null;
    this.masterGain = null;
  }
}

const audioManager = new AudioManager();

export function useAudioManager() {
  const settings = useSettingsStore((s) => s.settings.audio);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolumes(settings);
    return () => audioManager.stopEngine();
  }, []);

  useEffect(() => {
    audioManager.setVolumes(settings);
  }, [settings]);

  const playEngine = useCallback((
    speed: number,
    maxSpeed: number,
    health: number,
    throttle = 0,
    braking = 0,
  ) => {
    audioManager.playEngine(speed, maxSpeed, health, throttle, braking);
  }, []);

  const playCollisionImpact = useCallback((
    severity: 'small' | 'medium' | 'large' | 'heavy',
    speedKmh: number,
  ) => {
    audioManager.playCollisionImpact(severity, speedKmh);
  }, []);

  const playCelebration = useCallback(() => {
    audioManager.playCelebration();
  }, []);

  const playSound = useCallback((type: SoundType) => {
    audioManager.playOneShot(type);
  }, []);

  const stopEngine = useCallback(() => {
    audioManager.stopEngine();
  }, []);

  return { playEngine, playSound, playCollisionImpact, playCelebration, stopEngine };
}

export { audioManager };
