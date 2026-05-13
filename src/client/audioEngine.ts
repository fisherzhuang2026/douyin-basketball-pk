import { getSoundCue, type SoundCueId, type SoundNoise, type SoundTone } from "./audioCues";

export interface AudioSettings {
  enabled: boolean;
  volume: number;
}

export interface AudioEngine {
  unlock: () => Promise<boolean>;
  play: (cueId: SoundCueId) => Promise<void>;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  getSettings: () => AudioSettings;
  dispose: () => void;
}

type WindowWithWebkitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const SILENCE_GAIN = 0.0001;

export function createAudioEngine(initialSettings: Partial<AudioSettings> = {}): AudioEngine {
  let context: AudioContext | undefined;
  let settings: AudioSettings = {
    enabled: initialSettings.enabled ?? true,
    volume: clampVolume(initialSettings.volume ?? 0.36)
  };

  async function unlock(): Promise<boolean> {
    if (!settings.enabled) {
      return false;
    }
    const audioContext = getContext();
    if (!audioContext) {
      return false;
    }

    try {
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      return audioContext.state === "running";
    } catch {
      return false;
    }
  }

  async function play(cueId: SoundCueId): Promise<void> {
    if (!settings.enabled || settings.volume <= 0) {
      return;
    }

    const audioContext = getContext();
    if (!audioContext) {
      return;
    }

    try {
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
    } catch {
      return;
    }

    const cue = getSoundCue(cueId);
    const baseTime = audioContext.currentTime + 0.012;
    cue.tones.forEach((tone) => playTone(audioContext, tone, baseTime));
    cue.noises?.forEach((noise) => playNoise(audioContext, noise, baseTime));
  }

  function setEnabled(enabled: boolean) {
    settings = { ...settings, enabled };
  }

  function setVolume(volume: number) {
    settings = { ...settings, volume: clampVolume(volume) };
  }

  function getSettings(): AudioSettings {
    return { ...settings };
  }

  function dispose() {
    if (!context || context.state === "closed") {
      context = undefined;
      return;
    }
    void context.close().catch(() => undefined);
    context = undefined;
  }

  function getContext(): AudioContext | undefined {
    if (typeof window === "undefined") {
      return undefined;
    }
    const AudioContextCtor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!AudioContextCtor) {
      return undefined;
    }
    context ??= new AudioContextCtor();
    return context;
  }

  function playTone(audioContext: AudioContext, tone: SoundTone, baseTime: number) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const startTime = baseTime + tone.startMs / 1000;
    const endTime = startTime + tone.durationMs / 1000;
    const peakGain = Math.max(SILENCE_GAIN, (tone.gain ?? 0.08) * settings.volume);

    oscillator.type = tone.type ?? "sine";
    oscillator.frequency.setValueAtTime(Math.max(1, tone.frequency), startTime);
    if (tone.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, tone.endFrequency), endTime);
    }

    gainNode.gain.setValueAtTime(SILENCE_GAIN, startTime);
    gainNode.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.026);
    gainNode.gain.exponentialRampToValueAtTime(SILENCE_GAIN, endTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(startTime);
    oscillator.stop(endTime + 0.024);
  }

  function playNoise(audioContext: AudioContext, noise: SoundNoise, baseTime: number) {
    const durationSeconds = Math.max(0.02, noise.durationMs / 1000);
    const buffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * durationSeconds), audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }

    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gainNode = audioContext.createGain();
    const startTime = baseTime + noise.startMs / 1000;
    const endTime = startTime + durationSeconds;
    const peakGain = Math.max(SILENCE_GAIN, (noise.gain ?? 0.02) * settings.volume);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(noise.filterFrequency ?? 1600, startTime);
    gainNode.gain.setValueAtTime(SILENCE_GAIN, startTime);
    gainNode.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(SILENCE_GAIN, endTime);

    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(startTime);
    source.stop(endTime + 0.02);
  }

  return {
    unlock,
    play,
    setEnabled,
    setVolume,
    getSettings,
    dispose
  };
}

function clampVolume(volume: number): number {
  if (Number.isNaN(volume)) {
    return 0.36;
  }
  return Math.min(1, Math.max(0, volume));
}
