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

const HORN_AUDIO_URL = '/assets/audio/horn.mp3';
const LOBBY_MUSIC_URL = '/assets/audio/lobby-music.mp3';
const OVERTAKE_AUDIO_URL = '/assets/audio/overtake.mp3';
const CELEBRATION_AUDIO_URL = '/assets/audio/celebration.mp3';

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engine: EngineSynth | null = null;
  private hornBuffer: AudioBuffer | null = null;
  private hornLoadPromise: Promise<void> | null = null;
  private activeHornSource: AudioBufferSourceNode | null = null;
  private lobbyMusicBuffer: AudioBuffer | null = null;
  private lobbyMusicLoadPromise: Promise<void> | null = null;
  private lobbyMusicSource: AudioBufferSourceNode | null = null;
  private lobbyMusicGain: GainNode | null = null;
  private lobbyMusicPlaying = false;
  private overtakeBuffer: AudioBuffer | null = null;
  private overtakeLoadPromise: Promise<void> | null = null;
  private activeOvertakeSource: AudioBufferSourceNode | null = null;
  private overtakeCooldownUntil = 0;
  private celebrationBuffer: AudioBuffer | null = null;
  private celebrationLoadPromise: Promise<void> | null = null;
  private activeCelebrationSource: AudioBufferSourceNode | null = null;
  private volumes: Record<string, number> = {
    engine: 0.7, ambient: 0.5, ui: 0.6, master: 0.8,
  };

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = this.volumes.master;
    void this.loadHornBuffer();
    void this.loadLobbyMusicBuffer();
    void this.loadOvertakeBuffer();
    void this.loadCelebrationBuffer();
  }

  private async loadCelebrationBuffer() {
    if (!this.ctx || this.celebrationBuffer || this.celebrationLoadPromise) {
      return this.celebrationLoadPromise ?? undefined;
    }

    this.celebrationLoadPromise = (async () => {
      try {
        const response = await fetch(CELEBRATION_AUDIO_URL);
        if (!response.ok) return;
        const data = await response.arrayBuffer();
        if (!this.ctx) return;
        this.celebrationBuffer = await this.ctx.decodeAudioData(data);
      } catch {
        // Fall back to synthetic celebration if the asset fails to load
      }
    })();

    return this.celebrationLoadPromise;
  }

  private async loadOvertakeBuffer() {
    if (!this.ctx || this.overtakeBuffer || this.overtakeLoadPromise) {
      return this.overtakeLoadPromise ?? undefined;
    }

    this.overtakeLoadPromise = (async () => {
      try {
        const response = await fetch(OVERTAKE_AUDIO_URL);
        if (!response.ok) return;
        const data = await response.arrayBuffer();
        if (!this.ctx) return;
        this.overtakeBuffer = await this.ctx.decodeAudioData(data);
      } catch {
        // Overtake sound is optional
      }
    })();

    return this.overtakeLoadPromise;
  }

  playOvertakeSound() {
    if (!this.ctx) this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = Date.now();
    if (now < this.overtakeCooldownUntil) return;

    this.resumeContext();

    if (!this.overtakeBuffer) {
      void this.loadOvertakeBuffer().then(() => {
        if (this.overtakeBuffer) this.playOvertakeSound();
      });
      return;
    }

    this.overtakeCooldownUntil = now + 1500;

    if (this.activeOvertakeSource) {
      try {
        this.activeOvertakeSource.stop();
      } catch {
        // already stopped
      }
      this.activeOvertakeSource = null;
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = this.overtakeBuffer;
    gain.gain.value = 0.75 * this.volumes.master;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.onended = () => {
      if (this.activeOvertakeSource === source) {
        this.activeOvertakeSource = null;
      }
    };
    source.start();
    this.activeOvertakeSource = source;
  }

  private async loadLobbyMusicBuffer() {
    if (!this.ctx || this.lobbyMusicBuffer || this.lobbyMusicLoadPromise) {
      return this.lobbyMusicLoadPromise ?? undefined;
    }

    this.lobbyMusicLoadPromise = (async () => {
      try {
        const response = await fetch(LOBBY_MUSIC_URL);
        if (!response.ok) return;
        const data = await response.arrayBuffer();
        if (!this.ctx) return;
        this.lobbyMusicBuffer = await this.ctx.decodeAudioData(data);
      } catch {
        // Lobby music is optional
      }
    })();

    return this.lobbyMusicLoadPromise;
  }

  private getLobbyMusicVolume() {
    return 0.55 * this.volumes.ambient * this.volumes.master;
  }

  private startLobbyMusicPlayback() {
    if (!this.ctx || !this.masterGain || !this.lobbyMusicBuffer || this.lobbyMusicPlaying) return;

    this.stopLobbyMusic();

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = this.lobbyMusicBuffer;
    source.loop = true;
    gain.gain.value = this.getLobbyMusicVolume();
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
    this.lobbyMusicSource = source;
    this.lobbyMusicGain = gain;
    this.lobbyMusicPlaying = true;
  }

  playLobbyMusic() {
    if (!this.ctx) this.init();
    if (!this.ctx || !this.masterGain) return;
    this.resumeContext();

    if (this.lobbyMusicPlaying) return;

    if (!this.lobbyMusicBuffer) {
      void this.loadLobbyMusicBuffer().then(() => {
        if (this.lobbyMusicBuffer && !this.lobbyMusicPlaying) {
          this.startLobbyMusicPlayback();
        }
      });
      return;
    }

    this.startLobbyMusicPlayback();
  }

  stopLobbyMusic() {
    if (this.lobbyMusicSource) {
      try {
        this.lobbyMusicSource.stop();
      } catch {
        // already stopped
      }
      this.lobbyMusicSource.disconnect();
      this.lobbyMusicSource = null;
    }
    if (this.lobbyMusicGain) {
      this.lobbyMusicGain.disconnect();
      this.lobbyMusicGain = null;
    }
    this.lobbyMusicPlaying = false;
  }

  private async loadHornBuffer() {
    if (!this.ctx || this.hornBuffer || this.hornLoadPromise) return this.hornLoadPromise ?? undefined;

    this.hornLoadPromise = (async () => {
      try {
        const response = await fetch(HORN_AUDIO_URL);
        if (!response.ok) return;
        const data = await response.arrayBuffer();
        if (!this.ctx) return;
        this.hornBuffer = await this.ctx.decodeAudioData(data);
      } catch {
        // Fall back to synthetic horn if the asset fails to load
      }
    })();

    return this.hornLoadPromise;
  }

  private playHornSample() {
    if (!this.ctx || !this.masterGain) return;
    this.resumeContext();

    if (!this.hornBuffer) {
      void this.loadHornBuffer().then(() => {
        if (this.hornBuffer) this.playHornSample();
        else this.playSyntheticHorn();
      });
      return;
    }

    if (this.activeHornSource) {
      try {
        this.activeHornSource.stop();
      } catch {
        // already stopped
      }
      this.activeHornSource = null;
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = this.hornBuffer;
    gain.gain.value = 0.85 * this.volumes.master;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.onended = () => {
      if (this.activeHornSource === source) {
        this.activeHornSource = null;
      }
    };
    source.start();
    this.activeHornSource = source;
  }

  private playSyntheticHorn() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const t = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    gain.gain.setValueAtTime(0.18 * this.volumes.master, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  private resumeContext() {
    if (this.ctx?.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  setVolumes(volumes: { master: number; engine: number; ambient: number }) {
    this.volumes = { ...this.volumes, ...volumes };
    if (this.masterGain) this.masterGain.gain.value = volumes.master;
    if (this.lobbyMusicGain) {
      this.lobbyMusicGain.gain.value = this.getLobbyMusicVolume();
    }
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
    if (!this.ctx) this.init();
    if (!this.ctx || !this.masterGain) return;
    this.resumeContext();
    this.stopEngine();

    if (!this.celebrationBuffer) {
      void this.loadCelebrationBuffer().then(() => {
        if (this.celebrationBuffer) this.playCelebrationSample();
        else this.playSyntheticCelebration();
      });
      return;
    }

    this.playCelebrationSample();
  }

  private playCelebrationSample() {
    if (!this.ctx || !this.masterGain || !this.celebrationBuffer) return;

    if (this.activeCelebrationSource) {
      try {
        this.activeCelebrationSource.stop();
      } catch {
        // already stopped
      }
      this.activeCelebrationSource = null;
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = this.celebrationBuffer;
    gain.gain.value = 0.9 * this.volumes.master;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.onended = () => {
      if (this.activeCelebrationSource === source) {
        this.activeCelebrationSource = null;
      }
    };
    source.start();
    this.activeCelebrationSource = source;
  }

  private playSyntheticCelebration() {
    if (!this.ctx || !this.masterGain) return;
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

  stopCelebration() {
    if (this.activeCelebrationSource) {
      try {
        this.activeCelebrationSource.stop();
      } catch {
        // already stopped
      }
      this.activeCelebrationSource = null;
    }
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

    if (type === 'horn') {
      this.playHornSample();
      return;
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const t = this.ctx.currentTime;

    const configs: Partial<Record<SoundType, { freq: number; type: OscillatorType; duration: number; vol: number }>> = {
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
    this.stopLobbyMusic();
    this.stopCelebration();
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

  const playLobbyMusic = useCallback(() => {
    audioManager.playLobbyMusic();
  }, []);

  const stopLobbyMusic = useCallback(() => {
    audioManager.stopLobbyMusic();
  }, []);

  const playOvertakeSound = useCallback(() => {
    audioManager.playOvertakeSound();
  }, []);

  return {
    playEngine,
    playSound,
    playCollisionImpact,
    playCelebration,
    stopEngine,
    playLobbyMusic,
    stopLobbyMusic,
    playOvertakeSound,
  };
}

export { audioManager };
